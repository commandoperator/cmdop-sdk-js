/**
 * Zod schema for TokenResponse
 *
 * This schema provides runtime validation and type inference.
 *  * Response body for POST /api/oauth/token

Returns access token and refresh token.
 *  */
import { z } from 'zod'

/**
 * Response body for POST /api/oauth/token

Returns access token and refresh token.
 */
export const TokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string().optional(),
  expires_in: z.int(),
  scope: z.string().optional(),
  workspace_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  workspace_name: z.string(),
  user_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  user_email: z.email().optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type TokenResponse = z.infer<typeof TokenResponseSchema>