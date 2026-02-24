/**
 * Zod schema for MachineLog
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for MachineLog model.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Serializer for MachineLog model.
 */
export const MachineLogSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  machine: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  machine_name: z.string(),
  level: z.nativeEnum(Enums.MachineLogLevel),
  message: z.string(),
  source: z.string().max(100).optional(),
  created_at: z.string().datetime({ offset: true }),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type MachineLog = z.infer<typeof MachineLogSchema>