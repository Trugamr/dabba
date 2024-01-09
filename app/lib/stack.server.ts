import fs from 'fs/promises'
import path from 'path'
import { env } from './env.server'
import { execa } from 'execa'

type Stack = {
  name: string
  path: string
}

export function getStacksDirectory() {
  return env.STACKS_DIRECTORY
}

/**
 * Get list of child directories with `docker-compose.yml` present inside
 */
export async function getStacksList() {
  const stacksDirectory = getStacksDirectory()

  const entires = await fs.readdir(stacksDirectory, {
    withFileTypes: true,
  })

  const stacks: Stack[] = []

  for (const entry of entires) {
    if (entry.isDirectory()) {
      // Check if `docker-compose.yml` exists
      const composePath = path.join(stacksDirectory, entry.name, 'docker-compose.yml')
      try {
        const stats = await fs.stat(composePath)
        if (stats.isFile()) {
          const stackName = entry.name
          const stackPath = path.resolve(stacksDirectory, stackName)

          stacks.push({
            name: stackName,
            path: stackPath,
          })
        }
      } catch (error) {
        continue
      }
    }
  }

  return stacks
}

export async function getStackByName(name: string) {
  const stacksDirectory = getStacksDirectory()
  const stackPath = path.resolve(stacksDirectory, name)
  const composePath = path.join(stackPath, 'docker-compose.yml')

  // Check if `docker-compose.yml` exists and is a file
  try {
    const stats = await fs.stat(composePath)
    if (!stats.isFile()) {
      throw new Error(`Stack ${name} not found`)
    }
  } catch (error) {
    throw new Error(`Stack ${name} not found`)
  }

  return {
    name,
    path: stackPath,
  }
}

export async function startStack(stack: Stack) {
  try {
    await execa('docker', ['compose', 'up', '-d'], {
      cwd: stack.path,
    })
  } catch (error) {
    throw new Error(`Failed to start stack ${stack.name}`)
  }
}

export async function stopStack(stack: Stack) {
  try {
    await execa('docker', ['compose', 'down', '--remove-orphans'], {
      cwd: stack.path,
      stdout: 'inherit',
    })
  } catch (error) {
    throw new Error(`Failed to stop stack ${stack.name}`)
  }
}
