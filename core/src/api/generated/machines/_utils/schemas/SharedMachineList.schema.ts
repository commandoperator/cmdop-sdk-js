/**
 * Zod schema for SharedMachineList
 *
 * This schema provides runtime validation and type inference.
 *  * Lightweight serializer for listing shares.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Lightweight serializer for listing shares.
 */
export const SharedMachineListSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  share_token: z.string().max(64),
  permission: z.nativeEnum(Enums.SharedMachinePermission).optional(),
  machine: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  machine_name: z.string(),
  expires_at: z.string().datetime({ offset: true }).nullable().optional(),
  views_count: z.int().min(0.0).max(2147483647.0).optional(),
  is_active: z.boolean().optional(),
  is_expired: z.boolean(),
  is_valid: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type SharedMachineList = z.infer<typeof SharedMachineListSchema>