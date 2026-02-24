/**
 * Zod schema for TokenInfo
 *
 * This schema provides runtime validation and type inference.
 *  * Response for GET /api/oauth/token/info

Returns information about current token.
 *  */
import { z } from 'zod'

/**
 * Response for GET /api/oauth/token/info

Returns information about current token.
 */
export const TokenInfoSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  access_token_prefix: z.string().max(12),
  workspace_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  workspace_name: z.string(),
  user_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  username: z.string(),
  client_name: z.string().max(100).optional(),
  client_version: z.string().max(50).optional(),
  client_hostname: z.string().max(255).optional(),
  client_platform: z.string().max(50).optional(),
  created_at: z.string().datetime({ offset: true }),
  access_token_expires_at: z.string().datetime({ offset: true }),
  refresh_token_expires_at: z.string().datetime({ offset: true }),
  last_used_at: z.string().datetime({ offset: true }).nullable().optional(),
  is_expired: z.string(),
  is_refresh_expired: z.string(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type TokenInfo = z.infer<typeof TokenInfoSchema>