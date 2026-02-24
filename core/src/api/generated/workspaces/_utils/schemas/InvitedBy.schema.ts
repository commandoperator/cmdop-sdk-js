/**
 * Zod schema for InvitedBy
 *
 * This schema provides runtime validation and type inference.
 *  * Basic user info for invitation inviter.
 *  */
import { z } from 'zod'

/**
 * Basic user info for invitation inviter.
 */
export const InvitedBySchema = z.object({
  id: z.int(),
  email: z.email(),
  first_name: z.string(),
  last_name: z.string(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type InvitedBy = z.infer<typeof InvitedBySchema>