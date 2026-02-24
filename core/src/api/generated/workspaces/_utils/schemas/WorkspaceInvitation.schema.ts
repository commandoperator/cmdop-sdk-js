/**
 * Zod schema for WorkspaceInvitation
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for WorkspaceInvitation model.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'
import { InvitedBySchema } from './InvitedBy.schema'

/**
 * Serializer for WorkspaceInvitation model.
 */
export const WorkspaceInvitationSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  workspace: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  workspace_name: z.string(),
  email: z.email(),
  role: z.nativeEnum(Enums.WorkspaceInvitationRole).optional(),
  status: z.nativeEnum(Enums.WorkspaceInvitationStatus),
  invited_by: InvitedBySchema,
  created_at: z.string().datetime({ offset: true }),
  expires_at: z.string().datetime({ offset: true }),
  accepted_at: z.string().datetime({ offset: true }).nullable(),
  is_expired: z.boolean(),
  is_valid: z.boolean(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type WorkspaceInvitation = z.infer<typeof WorkspaceInvitationSchema>