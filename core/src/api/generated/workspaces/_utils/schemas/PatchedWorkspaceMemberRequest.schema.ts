/**
 * Zod schema for PatchedWorkspaceMemberRequest
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for WorkspaceMember model.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Serializer for WorkspaceMember model.
 */
export const PatchedWorkspaceMemberRequestSchema = z.object({
  workspace: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),
  user_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),
  role: z.nativeEnum(Enums.PatchedWorkspaceMemberRequestRole).optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type PatchedWorkspaceMemberRequest = z.infer<typeof PatchedWorkspaceMemberRequestSchema>