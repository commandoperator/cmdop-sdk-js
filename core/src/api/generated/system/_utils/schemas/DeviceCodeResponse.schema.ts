/**
 * Zod schema for DeviceCodeResponse
 *
 * This schema provides runtime validation and type inference.
 *  * Response body for POST /api/oauth/device

Returns device code info for CLI to display to user.
 *  */
import { z } from 'zod'

/**
 * Response body for POST /api/oauth/device

Returns device code info for CLI to display to user.
 */
export const DeviceCodeResponseSchema = z.object({
  device_code: z.string(),
  user_code: z.string(),
  verification_uri: z.string(),
  expires_in: z.int(),
  interval: z.int(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type DeviceCodeResponse = z.infer<typeof DeviceCodeResponseSchema>