/**
 * Zod schema for MachineCreate
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for creating machines.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Serializer for creating machines.
 */
export const MachineCreateSchema = z.object({
  workspace: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  name: z.string().max(100),
  hostname: z.string().max(255),
  os: z.nativeEnum(Enums.MachineOs),
  os_version: z.string().max(50).optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type MachineCreate = z.infer<typeof MachineCreateSchema>