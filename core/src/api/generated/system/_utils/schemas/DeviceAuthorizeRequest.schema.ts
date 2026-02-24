/**
 * Zod schema for DeviceAuthorizeRequest
 *
 * This schema provides runtime validation and type inference.
 *  * Request body for POST /api/oauth/authorize

User approves or denies device code in browser.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Request body for POST /api/oauth/authorize

User approves or denies device code in browser.
 */
export const DeviceAuthorizeRequestSchema = z.object({
  user_code: z.string().min(1).max(10),
  action: z.nativeEnum(Enums.DeviceAuthorizeRequestAction),
  workspace_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).nullable().optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type DeviceAuthorizeRequest = z.infer<typeof DeviceAuthorizeRequestSchema>