/**
 * Zod schema for WorkspaceInvitationRequest
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for WorkspaceInvitation model.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Serializer for WorkspaceInvitation model.
 */
export const WorkspaceInvitationRequestSchema = z.object({
  workspace: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  email: z.email(),
  role: z.nativeEnum(Enums.WorkspaceInvitationRole).optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type WorkspaceInvitationRequest = z.infer<typeof WorkspaceInvitationRequestSchema>