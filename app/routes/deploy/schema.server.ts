import { isStackNameUnique } from '~/lib/stack.server'
import { createDeploymentSchema } from './schema'

export const DeploymentSchemaServer = createDeploymentSchema({
  isDeployentNameUnique: isStackNameUnique,
})
