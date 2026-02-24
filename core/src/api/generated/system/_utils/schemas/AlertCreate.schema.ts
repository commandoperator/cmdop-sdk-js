/**
 * Zod schema for AlertCreate
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for creating alerts.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Serializer for creating alerts.
 */
export const AlertCreateSchema = z.object({
  workspace: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  type: z.nativeEnum(Enums.AlertType),
  title: z.string().max(200),
  message: z.string(),
  machine: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).nullable().optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type AlertCreate = z.infer<typeof AlertCreateSchema>