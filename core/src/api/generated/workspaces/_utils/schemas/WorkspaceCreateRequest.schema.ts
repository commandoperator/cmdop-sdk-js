/**
 * Zod schema for WorkspaceCreateRequest
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for creating workspaces.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Serializer for creating workspaces.
 */
export const WorkspaceCreateRequestSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.nativeEnum(Enums.PatchedWorkspaceRequestType).optional(),
  plan: z.nativeEnum(Enums.PatchedWorkspaceRequestPlan).optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type WorkspaceCreateRequest = z.infer<typeof WorkspaceCreateRequestSchema>