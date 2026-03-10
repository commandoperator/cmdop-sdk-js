/**
 * Zod schema for PaginatedTokenListList
 *
 * This schema provides runtime validation and type inference.
 *  */
import { z } from 'zod'
import { TokenListSchema } from './TokenList.schema'

export const PaginatedTokenListListSchema = z.object({
  count: z.number().int(),
  page: z.number().int(),
  pages: z.number().int(),
  page_size: z.number().int(),
  has_next: z.boolean(),
  has_previous: z.boolean(),
  next_page: z.number().int().nullable().optional(),
  previous_page: z.number().int().nullable().optional(),
  results: z.array(TokenListSchema),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type PaginatedTokenListList = z.infer<typeof PaginatedTokenListListSchema>