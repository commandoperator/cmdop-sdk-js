/**
 * Zod schema for DeviceAuthorizeResponse
 *
 * This schema provides runtime validation and type inference.
 *  * Response for device authorization.
 *  */
import { z } from 'zod'

/**
 * Response for device authorization.
 */
export const DeviceAuthorizeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  user_code: z.string(),
  status: z.string(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type DeviceAuthorizeResponse = z.infer<typeof DeviceAuthorizeResponseSchema>