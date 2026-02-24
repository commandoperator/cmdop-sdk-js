/**
 * Zod schema for WorkspaceMember
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for WorkspaceMember model.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'
import { UserBasicSchema } from './UserBasic.schema'

/**
 * Serializer for WorkspaceMember model.
 */
export const WorkspaceMemberSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  workspace: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  workspace_name: z.string(),
  user: UserBasicSchema,
  role: z.nativeEnum(Enums.PatchedWorkspaceMemberRequestRole).optional(),
  joined_at: z.string().datetime({ offset: true }),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>