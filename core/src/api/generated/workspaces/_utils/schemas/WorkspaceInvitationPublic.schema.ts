/**
 * Zod schema for WorkspaceInvitationPublic
 *
 * This schema provides runtime validation and type inference.
 *  * Public serializer for invitation details (for accept page).
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Public serializer for invitation details (for accept page).
 */
export const WorkspaceInvitationPublicSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  workspace_name: z.string(),
  email: z.email(),
  role: z.nativeEnum(Enums.WorkspaceInvitationRole).optional(),
  status: z.nativeEnum(Enums.WorkspaceInvitationStatus).optional(),
  invited_by_name: z.string(),
  created_at: z.string().datetime({ offset: true }),
  expires_at: z.string().datetime({ offset: true }).optional(),
  is_expired: z.boolean(),
  is_valid: z.boolean(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type WorkspaceInvitationPublic = z.infer<typeof WorkspaceInvitationPublicSchema>