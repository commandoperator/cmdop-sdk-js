/**
 * Zod schema for ApiKeyResponse
 *
 * This schema provides runtime validation and type inference.
 *  * Response serializer that includes raw key (shown only once).
 *  */
import { z } from 'zod'

/**
 * Response serializer that includes raw key (shown only once).
 */
export const ApiKeyResponseSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  workspace: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  name: z.string(),
  key_prefix: z.string(),
  raw_key: z.string(),
  created_by: z.int().nullable(),
  created_by_email: z.string(),
  created_at: z.string().datetime({ offset: true }),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type ApiKeyResponse = z.infer<typeof ApiKeyResponseSchema>