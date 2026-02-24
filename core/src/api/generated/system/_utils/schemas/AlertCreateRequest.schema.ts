/**
 * Zod schema for AlertCreateRequest
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for creating alerts.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Serializer for creating alerts.
 */
export const AlertCreateRequestSchema = z.object({
  workspace: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  type: z.nativeEnum(Enums.AlertType),
  title: z.string().min(1).max(200),
  message: z.string().min(1),
  machine: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).nullable().optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type AlertCreateRequest = z.infer<typeof AlertCreateRequestSchema>