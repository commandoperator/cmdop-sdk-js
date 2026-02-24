/**
 * Zod schema for ApiKeyCreateRequest
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for creating new API key.
 *  */
import { z } from 'zod'

/**
 * Serializer for creating new API key.
 */
export const ApiKeyCreateRequestSchema = z.object({
  name: z.string().min(1).max(100),
  workspace: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type ApiKeyCreateRequest = z.infer<typeof ApiKeyCreateRequestSchema>