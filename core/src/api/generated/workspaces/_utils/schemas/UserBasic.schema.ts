/**
 * Zod schema for UserBasic
 *
 * This schema provides runtime validation and type inference.
 *  * Basic user info for workspace members.
 *  */
import { z } from 'zod'

/**
 * Basic user info for workspace members.
 */
export const UserBasicSchema = z.object({
  id: z.int(),
  email: z.email(),
  first_name: z.string(),
  last_name: z.string(),
  username: z.string(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type UserBasic = z.infer<typeof UserBasicSchema>