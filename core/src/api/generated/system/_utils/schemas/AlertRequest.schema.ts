/**
 * Zod schema for AlertRequest
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for Alert model.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Serializer for Alert model.
 */
export const AlertRequestSchema = z.object({
  workspace: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  type: z.nativeEnum(Enums.AlertType),
  title: z.string().min(1).max(200),
  message: z.string().min(1),
  machine: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).nullable().optional(),
  read: z.boolean().optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type AlertRequest = z.infer<typeof AlertRequestSchema>