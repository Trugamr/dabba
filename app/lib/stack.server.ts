import fs from 'fs/promises'
import path from 'path'
import { env } from './env.server'
import { execa } from 'execa'
import { z } from 'zod'
import { invariant } from '@epic-web/invariant'

type ManagedStack = {
  name: string
  directory: string
  path: string
  managed: true
}

export type Stack = Omit<z.infer<typeof StackDetailsSchema>, 'status'> & {
  status: 'running' | 'stopped' | 'inactive'
  managed: boolean
}

export function getManagedStacksDirectory() {
  return env.STACKS_DIRECTORY
}

/**
 * Get list of stacks that are stored in the stacks directory (i.e. have a `docker-compose.yml` file)
 */
export async function getManagedStacks() {
  const stacksDirectory = getManagedStacksDirectory()

  const entires = await fs.readdir(stacksDirectory, {
    withFileTypes: true,
  })

  const stacks: ManagedStack[] = []

  for (const entry of entires) {
    if (entry.isDirectory()) {
      // Check if `docker-compose.yml` exists
      const composePath = path.join(stacksDirectory, entry.name, 'docker-compose.yml')
      try {
        const stats = await fs.stat(composePath)
        if (stats.isFile()) {
          const stackName = entry.name
          const stackDirectory = path.resolve(stacksDirectory, stackName)
          const configPath = path.join(stackDirectory, 'docker-compose.yml')

          stacks.push({
            name: stackName,
            directory: stackDirectory,
            path: configPath,
            managed: true,
          })
        }
      } catch (error) {
        continue
      }
    }
  }

  return stacks
}

export async function startStack(stack: Pick<Stack, 'path'>) {
  const directory = path.dirname(stack.path)
  try {
    await execa('docker', ['compose', 'up', '--detach', '--remove-orphans'], {
      cwd: directory,
    })
  } catch (error) {
    throw new Error(`Failed to start stack "${stack.path}"`)
  }
}

export async function stopStack(stack: Pick<Stack, 'path'>) {
  const directory = path.dirname(stack.path)
  try {
    await execa('docker', ['compose', 'stop'], {
      cwd: directory,
    })
  } catch (error) {
    throw new Error(`Failed to stop stack "${stack.path}"`)
  }
}

export async function destroyStack(stack: Pick<Stack, 'path'>) {
  const directory = path.dirname(stack.path)
  try {
    await execa('docker', ['compose', 'down', '--remove-orphans'], {
      cwd: directory,
    })
  } catch (error) {
    throw new Error(`Failed to destroy stack "${stack.path}"`)
  }
}

// Example: running(2) -> { current: 'running', count: 2 }
const STACK_STATUS_REGEX = /^(?<current>\w+)\((?<count>\d+)\)$/

const StackDetailsSchema = z
  .object({
    Name: z.string(),
    Status: z.preprocess(
      value => (typeof value === 'string' ? STACK_STATUS_REGEX.exec(value)?.groups : value),
      z.object({
        current: z
          .enum(['running', 'exited'])
          // Map `exited` to `stopped` for simplicity
          .transform(value => (value === 'exited' ? 'stopped' : value)),
        count: z.coerce.number(),
      }),
    ),
    ConfigFiles: z.string(),
  })
  .transform(values => {
    return {
      name: values.Name,
      status: values.Status.current,
      services: values.Status.count,
      directory: path.dirname(values.ConfigFiles),
      path: values.ConfigFiles,
    }
  })

const StacksDetailsSchema = z.array(StackDetailsSchema)

/**
 * Get details about stacks that are currently active (i.e. running or stopped)
 */
export async function getStacksDetails() {
  let stdout: string
  try {
    const result = await execa('docker', ['compose', 'ls', '--all', '--format', 'json'])
    stdout = result.stdout
  } catch (error) {
    throw new Error('Failed to get stacks details')
  }

  let json: unknown = null
  try {
    json = JSON.parse(stdout)
  } catch (error) {
    throw new Error('Failed to parse stacks details JSON')
  }

  return StacksDetailsSchema.parse(json)
}

/**
 * Get stacks list with details about their status
 */
export async function getStacks() {
  const [managedStacks, stacksDetails] = await Promise.all([
    getManagedStacks(),
    getStacksDetails(),
  ])

  const defaultDetails = {
    status: 'inactive',
    services: 0,
  } as const

  const stacks: Stack[] = []

  // Add managed stack with details if found
  for (const managedStack of managedStacks) {
    const detailsIndex = stacksDetails.findIndex(stack => stack.path === managedStack.path)
    if (detailsIndex !== -1) {
      // Remove the stack from the details list
      const [details] = stacksDetails.splice(detailsIndex, 1)
      invariant(details, 'Stack details should be defined')

      stacks.push({
        ...managedStack,
        ...details,
      })
    } else {
      stacks.push({
        ...managedStack,
        ...defaultDetails,
      })
    }
  }

  // Add remaining stacks from details list
  for (const stackDetails of stacksDetails) {
    // TODO: Handle dupicate stack names
    // Currently we prefer managed stacks over unmanaged ones
    const stackWithSameNameExists = stacks.some(stack => stack.name === stackDetails.name)
    if (!stackWithSameNameExists) {
      stacks.push({
        ...stackDetails,
        managed: false,
      })
    }
  }

  return stacks
}

export async function getStackByName(name: string) {
  const stacks = await getStacks()
  const stack = stacks.find(stack => stack.name === name)
  if (!stack) {
    return null
  }
  return stack
}

export async function getStackInitialLogs(stack: Pick<ManagedStack, 'directory'>) {
  try {
    const { stdout } = await execa('docker', ['compose', 'logs', '--tail', '50'], {
      cwd: stack.directory,
      stripFinalNewline: false,
    })
    return [stdout]
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to get stack's initial logs", error)
  }
}

export function getStackLogsProcess(stack: Pick<ManagedStack, 'directory'>) {
  return execa('docker', ['compose', 'logs', '--tail', '0', '--follow'], {
    cwd: stack.directory,
  })
}
