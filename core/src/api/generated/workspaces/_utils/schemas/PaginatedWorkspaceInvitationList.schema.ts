/**
 * Zod schema for PaginatedWorkspaceInvitationList
 *
 * This schema provides runtime validation and type inference.
 *  */
import { z } from 'zod'
import { WorkspaceInvitationSchema } from './WorkspaceInvitation.schema'

export const PaginatedWorkspaceInvitationListSchema = z.object({
  count: z.int(),
  page: z.int(),
  pages: z.int(),
  page_size: z.int(),
  has_next: z.boolean(),
  has_previous: z.boolean(),
  next_page: z.int().nullable().optional(),
  previous_page: z.int().nullable().optional(),
  results: z.array(WorkspaceInvitationSchema),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type PaginatedWorkspaceInvitationList = z.infer<typeof PaginatedWorkspaceInvitationListSchema>