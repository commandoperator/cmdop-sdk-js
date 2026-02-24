/**
 * Zod schema for DeviceCodeRequestRequest
 *
 * This schema provides runtime validation and type inference.
 *  * Request body for POST /api/oauth/device

Client sends metadata about itself.
 *  */
import { z } from 'zod'

/**
 * Request body for POST /api/oauth/device

Client sends metadata about itself.
 */
export const DeviceCodeRequestRequestSchema = z.object({
  client_name: z.string().min(1).max(100).optional(),
  client_version: z.string().max(50).optional(),
  client_hostname: z.string().max(255).optional(),
  client_platform: z.string().max(50).optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type DeviceCodeRequestRequest = z.infer<typeof DeviceCodeRequestRequestSchema>