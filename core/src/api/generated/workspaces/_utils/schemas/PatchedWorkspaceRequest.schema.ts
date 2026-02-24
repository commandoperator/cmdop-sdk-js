/**
 * Zod schema for PatchedWorkspaceRequest
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for Workspace model.

All fields are always present in responses (even read_only ones).
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Serializer for Workspace model.

All fields are always present in responses (even read_only ones).
 */
export const PatchedWorkspaceRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  type: z.nativeEnum(Enums.PatchedWorkspaceRequestType).optional(),
  plan: z.nativeEnum(Enums.PatchedWorkspaceRequestPlan).optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type PatchedWorkspaceRequest = z.infer<typeof PatchedWorkspaceRequestSchema>