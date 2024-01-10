import fs from 'fs/promises'
import path from 'path'
import { env } from './env.server'
import { execa } from 'execa'
import { z } from 'zod'

type StoredStack = {
  name: string
  directory: string
  path: string
}

type ActiveStack = Omit<z.infer<typeof ActiveStackSchema>, 'status'> & {
  status: 'running' | 'stopped'
}

export function getStacksDirectory() {
  return env.STACKS_DIRECTORY
}

/**
 * Get list of child directories with `docker-compose.yml` present inside
 */
export async function getStoredStacksList() {
  const stacksDirectory = getStacksDirectory()

  const entires = await fs.readdir(stacksDirectory, {
    withFileTypes: true,
  })

  const stacks: StoredStack[] = []

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
          })
        }
      } catch (error) {
        continue
      }
    }
  }

  return stacks
}

export async function getStoredStackByName(name: string): Promise<StoredStack> {
  const stacksDirectory = getStacksDirectory()
  const stackDirectory = path.resolve(stacksDirectory, name)
  const configPath = path.join(stackDirectory, 'docker-compose.yml')

  // Check if `docker-compose.yml` exists and is a file
  try {
    const stats = await fs.stat(configPath)
    if (!stats.isFile()) {
      throw new Error(`Stack ${name} not found`)
    }
  } catch (error) {
    throw new Error(`Stack ${name} not found`)
  }

  return {
    name,
    directory: stackDirectory,
    path: configPath,
  }
}

export async function startStack(stack: StoredStack) {
  try {
    await execa('docker', ['compose', 'up', '-d'], {
      cwd: stack.directory,
    })
  } catch (error) {
    throw new Error(`Failed to start stack ${stack.name}`)
  }
}

export async function stopStack(stack: StoredStack) {
  try {
    await execa('docker', ['compose', 'down', '--remove-orphans'], {
      cwd: stack.directory,
    })
  } catch (error) {
    throw new Error(`Failed to stop stack ${stack.name}`)
  }
}

// Example: running(2)
const STACK_STATUS_REGEX = /^(?<current>\w+)\((?<count>\d+)\)$/

const ActiveStackSchema = z
  .object({
    Name: z.string(),
    Status: z.preprocess(
      value => (typeof value === 'string' ? STACK_STATUS_REGEX.exec(value)?.groups : value),
      z.object({
        // TODO: Check correctness of this enum
        current: z.enum(['running']),
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

const ActiveStackListSchema = z.array(ActiveStackSchema)

/**
 * Get list of active stacks using
 */
export async function getActiveStacksList(): Promise<ActiveStack[]> {
  let stdout: string
  try {
    const result = await execa('docker', ['compose', 'ls', '--format', 'json'])
    stdout = result.stdout
  } catch (error) {
    throw new Error(`Failed to get active stacks`)
  }

  let json: unknown = null
  try {
    json = JSON.parse(stdout)
  } catch (error) {
    throw new Error(`Failed to parse active stacks JSON`)
  }

  return ActiveStackListSchema.parse(json)
}

/**
 * Get stored stacks with their status
 */
export async function getStacksList() {
  const [storedStacks, activeStacks] = await Promise.all([
    getStoredStacksList(),
    getActiveStacksList(),
  ])
  const stacks: ActiveStack[] = []

  for (const storedStack of storedStacks) {
    const activeStack = activeStacks.find(stack => stack.path === storedStack.path)
    if (activeStack) {
      stacks.push(activeStack)
    } else {
      stacks.push({
        ...storedStack,
        status: 'stopped',
        services: 0,
      })
    }
  }

  return stacks
}

export async function getStackByName(name: string) {
  const stacks = await getStacksList()
  const stack = stacks.find(stack => stack.name === name)
  if (!stack) {
    throw new Error(`Stack ${name} not found`)
  }
  return stack
}
