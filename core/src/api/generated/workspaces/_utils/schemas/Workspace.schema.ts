/**
 * Zod schema for Workspace
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
export const WorkspaceSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  name: z.string().max(100),
  slug: z.string().max(100),
  type: z.nativeEnum(Enums.PatchedWorkspaceRequestType).optional(),
  plan: z.nativeEnum(Enums.PatchedWorkspaceRequestPlan).optional(),
  created_at: z.string().datetime({ offset: true }),
  member_count: z.int(),
  machine_count: z.int(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type Workspace = z.infer<typeof WorkspaceSchema>