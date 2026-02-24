/**
 * Zod schema for SharedMachineCreateRequest
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for creating a new share.
 *  */
import { z } from 'zod'

/**
 * Serializer for creating a new share.
 */
export const SharedMachineCreateRequestSchema = z.object({
  expires_in_hours: z.int().min(1.0).max(720.0).nullable().optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type SharedMachineCreateRequest = z.infer<typeof SharedMachineCreateRequestSchema>