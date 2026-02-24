/**
 * Zod schema for ApiKey
 *
 * This schema provides runtime validation and type inference.
 *  * Read-only serializer for ApiKey (hides actual key).
 *  */
import { z } from 'zod'

/**
 * Read-only serializer for ApiKey (hides actual key).
 */
export const ApiKeySchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  workspace: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  name: z.string(),
  key_prefix: z.string(),
  last_used: z.string().datetime({ offset: true }).nullable(),
  created_by: z.int().nullable(),
  created_by_email: z.string(),
  created_at: z.string().datetime({ offset: true }),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type ApiKey = z.infer<typeof ApiKeySchema>