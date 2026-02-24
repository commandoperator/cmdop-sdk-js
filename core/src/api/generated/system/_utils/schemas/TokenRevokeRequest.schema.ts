/**
 * Zod schema for TokenRevokeRequest
 *
 * This schema provides runtime validation and type inference.
 *  * Request body for POST /api/oauth/revoke

Revoke access token or refresh token.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Request body for POST /api/oauth/revoke

Revoke access token or refresh token.
 */
export const TokenRevokeRequestSchema = z.object({
  token: z.string().min(1),
  token_type_hint: z.nativeEnum(Enums.TokenRevokeRequestTokenTypeHint).optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type TokenRevokeRequest = z.infer<typeof TokenRevokeRequestSchema>