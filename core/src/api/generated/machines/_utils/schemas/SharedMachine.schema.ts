/**
 * Zod schema for SharedMachine
 *
 * This schema provides runtime validation and type inference.
 *  * Full shared machine details (for owners).
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Full shared machine details (for owners).
 */
export const SharedMachineSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  share_token: z.string(),
  share_url: z.string(),
  permission: z.nativeEnum(Enums.SharedMachinePermission).optional(),
  machine: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  machine_name: z.string(),
  machine_hostname: z.string(),
  machine_status: z.string(),
  expires_at: z.string().datetime({ offset: true }).nullable().optional(),
  views_count: z.int(),
  last_viewed_at: z.string().datetime({ offset: true }).nullable(),
  is_active: z.boolean().optional(),
  is_expired: z.boolean(),
  is_valid: z.boolean(),
  active_sessions_count: z.int(),
  created_by: z.int(),
  created_at: z.string().datetime({ offset: true }),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type SharedMachine = z.infer<typeof SharedMachineSchema>