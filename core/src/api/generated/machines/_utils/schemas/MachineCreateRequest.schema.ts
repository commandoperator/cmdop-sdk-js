/**
 * Zod schema for MachineCreateRequest
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for creating machines.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Serializer for creating machines.
 */
export const MachineCreateRequestSchema = z.object({
  workspace: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  name: z.string().min(1).max(100),
  hostname: z.string().min(1).max(255),
  os: z.nativeEnum(Enums.MachineOs),
  os_version: z.string().max(50).optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type MachineCreateRequest = z.infer<typeof MachineCreateRequestSchema>