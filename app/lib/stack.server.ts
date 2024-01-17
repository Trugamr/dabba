import fs from 'fs/promises'
import path from 'path'
import { env } from './env.server'
import { execa } from 'execa'
import { z } from 'zod'
import { invariant } from '@epic-web/invariant'
import { match } from 'ts-pattern'
import { isExecaError } from './execa.server'

type ManagedStack = {
  name: string
  directory: string
  path: string
  control: 'full'
}

type StackSummary = z.infer<typeof StackSummarySchema>

export type Stack = Omit<StackSummary, 'status' | 'statuses'> & {
  status: StackSummary['status'] | 'inactive'
  statuses: StackSummary['statuses'] | null
  control: 'full' | 'partial' | 'none'
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
            control: 'full',
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
    await execa(
      'docker',
      ['compose', '--file', stack.path, 'up', '--detach', '--remove-orphans'],
      {
        cwd: directory,
      },
    )
  } catch (error) {
    throw new Error(`Failed to start stack "${stack.path}"`)
  }
}

export async function stopStack(stack: Pick<Stack, 'path'>) {
  const directory = path.dirname(stack.path)
  try {
    await execa('docker', ['compose', '--file', stack.path, 'stop'], {
      cwd: directory,
    })
  } catch (error) {
    throw new Error(`Failed to stop stack "${stack.path}"`)
  }
}

export async function destroyStack(stack: Pick<Stack, 'path'>) {
  const directory = path.dirname(stack.path)
  try {
    await execa('docker', ['compose', '--file', stack.path, 'down', '--remove-orphans'], {
      cwd: directory,
    })
  } catch (error) {
    throw new Error(`Failed to destroy stack "${stack.path}"`)
  }
}

// Example: running(2) -> { value: 'running', count: 2 }
const SERVICE_STATUS_REGEX = /^(?<value>\w+)\((?<count>\d+)\)$/

export type ServiceState = z.infer<typeof ServiceStateSchema>

const ServiceStateSchema = z.enum([
  'paused',
  'restarting',
  'removing',
  'running',
  'dead',
  'created',
  'exited',
])

const ServiceStatusesSchema = z.preprocess(
  value => (typeof value === 'string' ? SERVICE_STATUS_REGEX.exec(value)?.groups : value),
  z.object({
    value: ServiceStateSchema,
    count: z.coerce.number(),
  }),
)

const StackSummarySchema = z
  .object({
    Name: z.string(),
    Status: z.preprocess(
      value => (typeof value === 'string' ? value.split(', ') : value),
      z.array(ServiceStatusesSchema),
    ),
    ConfigFiles: z.string(),
  })
  .transform(values => {
    const statuses = values.Status
    const status = match(statuses.map(s => s.value))
      // When every service has same status there is only one entry in the array
      .with(['running'], () => 'active' as const)
      .with(['exited'], () => 'stopped' as const)
      .otherwise(() => 'transitioning' as const)

    return {
      name: values.Name,
      status,
      statuses,
      directory: path.dirname(values.ConfigFiles),
      path: values.ConfigFiles,
    }
  })

const StacksSummariesSchema = z.array(StackSummarySchema)

/**
 * Get summary about stacks that are currently active (i.e. running or stopped)
 */
export async function getStacksSummaries() {
  let stdout: string
  try {
    const result = await execa('docker', ['compose', 'ls', '--all', '--format', 'json'])
    stdout = result.stdout
  } catch (error) {
    throw new Error('Failed to get stacks summaries')
  }

  let json: unknown
  try {
    json = JSON.parse(stdout)
  } catch (error) {
    throw new Error('Failed to parse stacks summaries JSON')
  }

  return StacksSummariesSchema.parse(json)
}

/**
 * Get stacks list with summaries about their status
 */
export async function getStacks() {
  const [managedStacks, stacksSummaries] = await Promise.all([
    getManagedStacks(),
    getStacksSummaries(),
  ])

  const defaultSummary = {
    status: 'inactive',
    statuses: null,
  } satisfies Pick<Stack, 'status' | 'statuses'>

  const stacks: Stack[] = []

  // Add managed stack with summary if found
  for (const managedStack of managedStacks) {
    const summaryIndex = stacksSummaries.findIndex(stack => stack.name === managedStack.name)
    if (summaryIndex !== -1) {
      // Remove the stack from the summaries list
      const [summary] = stacksSummaries.splice(summaryIndex, 1)
      invariant(summary, 'Stack summary should be defined')

      stacks.push({
        ...managedStack,
        status: summary.status,
        statuses: summary.statuses,
        /**
         * Stack is partially controlled when it's path doesn't match the path of the summary
         * This means same named stack is started outside of the stacks and it may or may not be the same stack
         */
        control: managedStack.path === summary.path ? 'full' : 'partial',
      })
    } else {
      stacks.push({
        ...managedStack,
        ...defaultSummary,
      })
    }
  }

  // Add remaining stacks from summaries list
  for (const stackSummary of stacksSummaries) {
    // TODO: Handle dupicate stack names
    // Currently we prefer managed stacks over unmanaged ones
    const stackWithSameNameExists = stacks.some(stack => stack.name === stackSummary.name)
    if (!stackWithSameNameExists) {
      stacks.push({
        ...stackSummary,
        control: 'none',
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

export async function getStackInitialLogs(stack: Pick<ManagedStack, 'directory' | 'path'>) {
  try {
    const { stdout } = await execa(
      'docker',
      ['compose', '--file', stack.path, 'logs', '--tail', '50'],
      {
        cwd: stack.directory,
        stripFinalNewline: false,
      },
    )
    return [stdout]
  } catch (error) {
    if (isExecaError(error)) {
      // TODO: User debug log
      // eslint-disable-next-line no-console
      console.error(error.stderr)
      throw new Error('Failed to get stack logs')
    }
    throw error
  }
}

export function getStackLogsProcess(stack: Pick<ManagedStack, 'directory' | 'path'>) {
  return execa('docker', ['compose', '--file', stack.path, 'logs', '--tail', '0', '--follow'], {
    cwd: stack.directory,
  })
}

export type ServiceCanonicalConfig = z.infer<typeof ServiceCanonicalConfigSchema>

const ServiceCanonicalConfigSchema = z
  .object({
    command: z.array(z.string()).nullable(),
    entrypoint: z.string().nullable(),
    image: z.string(),
    ports: z
      .array(
        z.object({
          mode: z.enum(['host', 'ingress']),
          target: z.number(),
          published: z.string(),
          protocol: z.enum(['tcp', 'udp']),
        }),
      )
      .optional(),
  })
  .transform(values => {
    return {
      ...values,
      state: 'inactive',
    } as const
  })

const StackCanonicalConfigSchema = z.object({
  name: z.string(),
  services: z.record(z.string(), ServiceCanonicalConfigSchema),
})

/**
 * Get compose config for a stack
 */
export async function getCanonicalStackConfig(stack: Pick<Stack, 'directory' | 'path'>) {
  let stdout: string
  try {
    const result = await execa(
      'docker',
      ['compose', '--file', stack.path, 'config', '--format', 'json'],
      {
        cwd: stack.directory,
      },
    )
    stdout = result.stdout
  } catch (error) {
    throw new Error('Failed to get stack config')
  }

  let json: unknown
  try {
    json = JSON.parse(stdout)
  } catch (error) {
    throw new Error('Failed to parse stack config JSON')
  }

  return StackCanonicalConfigSchema.parse(json)
}

const StackServiceDetailsSchema = z
  .object({
    Name: z.string(),
    Service: z.string(),
    State: ServiceStateSchema,
  })
  .transform(values => {
    return {
      name: values.Name,
      service: values.Service,
      state: values.State,
    } as const
  })

const StackServicesDetailsSchema = z.array(StackServiceDetailsSchema)

/**
 * Get extended stack details
 */
export async function getStackDetails(stack: Pick<Stack, 'directory' | 'path'>) {
  const config = await getCanonicalStackConfig(stack)

  let stdout: string
  try {
    const result = await execa(
      'docker',
      ['compose', '--file', stack.path, 'ps', '--all', '--format', 'json'],
      {
        cwd: stack.directory,
      },
    )
    stdout = result.stdout
  } catch (error) {
    throw new Error('Failed to get stack details')
  }

  let lines: unknown[]
  try {
    lines = stdout
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line))
  } catch (error) {
    throw new Error('Failed to parse stack details JSON')
  }

  const details = StackServicesDetailsSchema.parse(lines)

  const merged: {
    services: Record<
      string,
      Omit<ServiceCanonicalConfig, 'state'> & {
        info?: {
          name: string
          state: ServiceState
        }
      }
    >
  } = {
    services: {
      ...structuredClone(config.services),
    },
  }

  // Merge details into config
  for (const detail of details) {
    if (detail.service in merged.services) {
      const service = merged.services[detail.service]
      invariant(service, 'Service should be defined')

      service.info = {
        name: detail.name,
        state: detail.state,
      }
    }
  }

  return merged
}

/**
 * @returns `true` if managed stack with given name doesn't exist
 */
export async function isStackNameUnique(name: string) {
  const stacksDirectory = getManagedStacksDirectory()
  const stackDirectory = path.join(stacksDirectory, name)

  try {
    await fs.stat(stackDirectory)
    return false
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return true
    }
    throw error
  }
}
