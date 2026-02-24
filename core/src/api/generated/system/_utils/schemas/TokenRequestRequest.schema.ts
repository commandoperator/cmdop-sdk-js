/**
 * Zod schema for TokenRequestRequest
 *
 * This schema provides runtime validation and type inference.
 *  * Request body for POST /api/oauth/token

CLI polls with device_code until approved.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Request body for POST /api/oauth/token

CLI polls with device_code until approved.
 */
export const TokenRequestRequestSchema = z.object({
  grant_type: z.nativeEnum(Enums.TokenRequestRequestGrantType),
  device_code: z.string().min(1).optional(),
  refresh_token: z.string().min(1).optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type TokenRequestRequest = z.infer<typeof TokenRequestRequestSchema>