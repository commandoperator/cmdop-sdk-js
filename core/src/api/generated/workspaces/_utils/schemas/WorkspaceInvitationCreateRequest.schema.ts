/**
 * Zod schema for WorkspaceInvitationCreateRequest
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for creating workspace invitation.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Serializer for creating workspace invitation.
 */
export const WorkspaceInvitationCreateRequestSchema = z.object({
  email: z.email(),
  role: z.nativeEnum(Enums.WorkspaceInvitationCreateRequestRole).optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type WorkspaceInvitationCreateRequest = z.infer<typeof WorkspaceInvitationCreateRequestSchema>