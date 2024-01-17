import { refine } from '@conform-to/zod'
import { z } from 'zod'

export const DeploymentServiceSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(1, { message: 'Name cannot be empty' }),
  image: z
    .string({ required_error: 'Image is required' })
    .min(1, { message: 'Image cannot be empty' }),
})

export const DeploymentSchema = createDeploymentSchema()
export type Deployment = z.infer<typeof DeploymentSchema>

export function createDeploymentSchema(constraint?: {
  isDeployentNameUnique: (name: string) => Promise<boolean>
}) {
  return z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .min(3, {
        message: 'Name must be at least 3 characters long',
      })
      .pipe(
        z.string().superRefine((name, ctx) => {
          return refine(ctx, {
            validate: () => constraint?.isDeployentNameUnique(name),
            message: `Deployment with name "${name}" already exists`,
          })
        }),
      ),
    services: z
      .array(DeploymentServiceSchema)
      .min(1, { message: 'At least one service is required' }),
  })
}

export const ComposeConfigSchema = z.object({
  version: z.literal('3.8'),
  services: z
    .record(
      z.string(),
      z.object({
        image: z.string(),
      }),
    )
    .refine(value => Object.keys(value).length > 0, {
      message: 'At least one service is required',
    }),
})

export type ComposeConfig = z.infer<typeof ComposeConfigSchema>
