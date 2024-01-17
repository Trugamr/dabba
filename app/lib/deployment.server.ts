import { Deployment } from '~/routes/deploy/schema'
import {
  convertComposeConfigToYaml,
  convertDeploymentToComposeConfig,
} from '~/routes/deploy/utils'
import { getManagedStacksDirectory } from './stack.server'
import path from 'node:path'
import fs from 'node:fs/promises'

export async function createNewDeployment(deployment: Deployment) {
  let composeConfig: ReturnType<typeof convertDeploymentToComposeConfig>
  try {
    composeConfig = convertDeploymentToComposeConfig(deployment)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error)
    throw new Error('Failed to convert deployment to compose config')
  }

  let composeYaml: ReturnType<typeof convertComposeConfigToYaml>
  try {
    composeYaml = convertComposeConfigToYaml(composeConfig)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error)
    throw new Error('Failed to convert compose config to yaml')
  }

  // Create a new directory for the stack
  const stackDirectory = path.resolve(getManagedStacksDirectory(), deployment.name)

  try {
    await fs.mkdir(stackDirectory)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
      throw new Error(`Stack with name "${deployment.name}" already exists`)
    }
    // eslint-disable-next-line no-console
    console.error(error)
    throw new Error('Failed to create stack directory')
  }

  // Create a new docker-compose.yml file
  const composeYamlPath = path.resolve(stackDirectory, 'docker-compose.yml')
  try {
    await fs.writeFile(composeYamlPath, composeYaml)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error)
    throw new Error('Failed to create docker-compose.yml file')
  }
}
