/**
 * Zod utilities for structured output schemas
 *
 * Provides type-safe schema definition using Zod with automatic
 * JSON Schema conversion for agent.extract()
 *
 * Uses Zod v4's native z.toJSONSchema() for conversion.
 *
 * @example
 * ```typescript
 * import { z, zodToJsonSchema } from '@cmdop/node';
 *
 * const FileListSchema = z.object({
 *   files: z.array(z.string()),
 *   total: z.number(),
 * });
 *
 * // Use with extract
 * const data = await client.agent.extract(
 *   'List files in /tmp',
 *   zodToJsonSchema(FileListSchema)
 * );
 * // data is typed as { files: string[], total: number }
 * ```
 */

import { z } from 'zod/v4';

/**
 * Options for JSON Schema conversion
 */
export interface ZodToJsonSchemaOptions {
  /**
   * Target JSON Schema version (default: 'draft-07')
   */
  target?: 'draft-2020-12' | 'draft-07' | 'draft-04' | 'openapi-3.0';

  /**
   * How to handle unrepresentable types (default: 'any')
   * - 'throw': throw an error
   * - 'any': convert to empty schema {}
   */
  unrepresentable?: 'throw' | 'any';
}

/**
 * Convert a Zod schema to JSON Schema string for use with agent.extract()
 *
 * Uses Zod v4's native z.toJSONSchema() for conversion.
 *
 * @param schema - Zod schema to convert
 * @param options - Optional configuration
 * @returns JSON Schema as string
 *
 * @example
 * ```typescript
 * import { z, zodToJsonSchema } from '@cmdop/node';
 *
 * const PersonSchema = z.object({
 *   name: z.string(),
 *   age: z.number().optional(),
 *   email: z.string().email().optional(),
 * });
 *
 * const jsonSchema = zodToJsonSchema(PersonSchema);
 * // Returns: '{"type":"object","properties":{"name":{"type":"string"},...}}'
 * ```
 */
export function zodToJsonSchema(
  schema: z.ZodType,
  options: ZodToJsonSchemaOptions = {}
): string {
  const jsonSchema = z.toJSONSchema(schema, {
    target: options.target ?? 'draft-07',
    unrepresentable: options.unrepresentable ?? 'any',
  });

  return JSON.stringify(jsonSchema);
}

/**
 * Type helper to infer the TypeScript type from a Zod schema
 *
 * @example
 * ```typescript
 * import { z } from '@cmdop/node';
 * import type { InferSchema } from '@cmdop/node';
 *
 * const FileSchema = z.object({
 *   name: z.string(),
 *   size: z.number(),
 * });
 *
 * type File = InferSchema<typeof FileSchema>;
 * // File = { name: string; size: number }
 * ```
 */
export type InferSchema<T extends z.ZodType> = z.infer<T>;

// Re-export Zod for convenience
export { z };
