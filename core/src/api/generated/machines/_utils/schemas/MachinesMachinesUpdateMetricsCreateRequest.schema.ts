/**
 * Zod schema for MachinesMachinesUpdateMetricsCreateRequest
 *
 * This schema provides runtime validation and type inference.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

export const MachinesMachinesUpdateMetricsCreateRequestSchema = z.object({
  cpu_usage: z.number().min(0.0).max(100.0).optional(),
  memory_usage: z.number().min(0.0).max(100.0).optional(),
  status: z.nativeEnum(Enums.MachinesMachinesUpdateMetricsCreateRequestStatus).optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type MachinesMachinesUpdateMetricsCreateRequest = z.infer<typeof MachinesMachinesUpdateMetricsCreateRequestSchema>