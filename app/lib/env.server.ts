import { z } from 'zod'

export const env = z
  .object({
    STACKS_DIRECTORY: z.string().default('./stacks'),
  })
  .parse(process.env)
