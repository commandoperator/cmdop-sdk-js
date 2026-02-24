/**
 * Zod schema for TokenList
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for listing user's CLI tokens.
 *  */
import { z } from 'zod'

/**
 * Serializer for listing user's CLI tokens.
 */
export const TokenListSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  access_token_prefix: z.string().max(12),
  workspace_name: z.string(),
  client_name: z.string().max(100).optional(),
  client_hostname: z.string().max(255).optional(),
  client_platform: z.string().max(50).optional(),
  created_at: z.string().datetime({ offset: true }),
  last_used_at: z.string().datetime({ offset: true }).nullable().optional(),
  revoked_at: z.string().datetime({ offset: true }).nullable().optional(),
  is_active: z.string(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type TokenList = z.infer<typeof TokenListSchema>