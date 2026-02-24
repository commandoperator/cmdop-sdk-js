/**
 * Zod schema for WorkspaceInvitationAcceptRequest
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for accepting workspace invitation.
 *  */
import { z } from 'zod'

/**
 * Serializer for accepting workspace invitation.
 */
export const WorkspaceInvitationAcceptRequestSchema = z.object({
  token: z.string().min(1).max(64),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type WorkspaceInvitationAcceptRequest = z.infer<typeof WorkspaceInvitationAcceptRequestSchema>