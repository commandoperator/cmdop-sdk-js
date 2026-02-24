/**
 * Zod schema for PatchedAlertRequest
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for Alert model.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Serializer for Alert model.
 */
export const PatchedAlertRequestSchema = z.object({
  workspace: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),
  type: z.nativeEnum(Enums.AlertType).optional(),
  title: z.string().min(1).max(200).optional(),
  message: z.string().min(1).optional(),
  machine: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).nullable().optional(),
  read: z.boolean().optional(),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type PatchedAlertRequest = z.infer<typeof PatchedAlertRequestSchema>