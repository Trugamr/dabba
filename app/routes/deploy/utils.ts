import { ComposeConfigSchema, type Deployment, type ComposeConfig } from './schema'
import type { PartialDeep } from 'type-fest'
import YAML from 'yaml'

/**
 * Takes a deployment and converts it to a valid docker-comopose config
 */
export function convertDeploymentToComposeConfig(deployment: Deployment): ComposeConfig {
  const config = {
    version: '3.8',
    services: {},
  } satisfies PartialDeep<ComposeConfig>

  for (const service of deployment.services) {
    config.services = {
      ...config.services,
      [service.name]: {
        image: service.image,
        ports: service.ports.map(port => `${port.published}:${port.target}`),
      },
    }
  }

  return ComposeConfigSchema.parse(config)
}

export function convertComposeConfigToYaml(config: ComposeConfig): string {
  // TODO: Add spaces between sections
  return YAML.stringify(config)
}
