/**
 * Zod schema for Alert
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for Alert model.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Serializer for Alert model.
 */
export const AlertSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  workspace: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  type: z.nativeEnum(Enums.AlertType),
  title: z.string().max(200),
  message: z.string(),
  machine: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).nullable().optional(),
  machine_name: z.string().nullable(),
  read: z.boolean().optional(),
  is_unread: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type Alert = z.infer<typeof AlertSchema>