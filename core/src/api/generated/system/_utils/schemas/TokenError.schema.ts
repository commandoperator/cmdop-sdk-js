/**
 * Zod schema for TokenError
 *
 * This schema provides runtime validation and type inference.
 *  * Error response for POST /api/oauth/token

OAuth 2.0 standard error format.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Error response for POST /api/oauth/token

OAuth 2.0 standard error format.
 */
export const TokenErrorSchema = z.object({
  error: z.nativeEnum(Enums.TokenErrorError),
  error_description: z.string().optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type TokenError = z.infer<typeof TokenErrorSchema>