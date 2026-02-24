/**
 * Zod schema for MachineLogRequest
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for MachineLog model.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Serializer for MachineLog model.
 */
export const MachineLogRequestSchema = z.object({
  machine: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  level: z.nativeEnum(Enums.MachineLogLevel),
  message: z.string().min(1),
  source: z.string().max(100).optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type MachineLogRequest = z.infer<typeof MachineLogRequestSchema>