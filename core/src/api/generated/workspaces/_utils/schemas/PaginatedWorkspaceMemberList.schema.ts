/**
 * Zod schema for PaginatedWorkspaceMemberList
 *
 * This schema provides runtime validation and type inference.
 *  */
import { z } from 'zod'
import { WorkspaceMemberSchema } from './WorkspaceMember.schema'

export const PaginatedWorkspaceMemberListSchema = z.object({
  count: z.int(),
  page: z.int(),
  pages: z.int(),
  page_size: z.int(),
  has_next: z.boolean(),
  has_previous: z.boolean(),
  next_page: z.int().nullable().optional(),
  previous_page: z.int().nullable().optional(),
  results: z.array(WorkspaceMemberSchema),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type PaginatedWorkspaceMemberList = z.infer<typeof PaginatedWorkspaceMemberListSchema>