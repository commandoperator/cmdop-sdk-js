/**
 * Zod schema for ActiveTerminalSession
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for active terminal session info.
 *  */
import { z } from 'zod'

/**
 * Serializer for active terminal session info.
 */
export const ActiveTerminalSessionSchema = z.object({
  session_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  created_at: z.string().datetime({ offset: true }),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type ActiveTerminalSession = z.infer<typeof ActiveTerminalSessionSchema>