/**
 * Extract service for structured data extraction via AI agent
 */

import { CMDOPError } from '@cmdop/core';
import type {
  ExtractOptions as ProtoExtractOptions,
  ExtractMetrics as ProtoExtractMetrics,
  ExtractTokenUsage as ProtoExtractTokenUsage,
} from '../proto/generated/rpc_messages/extract';
import { BaseService } from './base';
import { z } from '../schema';
import { zodToJsonSchema } from '../schema';

// ============================================================================
// Public types
// ============================================================================

export interface ExtractOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  maxRetries?: number;
  timeoutSeconds?: number;
  workingDirectory?: string;
  enabledTools?: string[];
}

export interface ExtractMetrics {
  durationMs: number;
  llmDurationMs: number;
  toolDurationMs: number;
  llmCalls: number;
  toolCalls: number;
  retries: number;
  tokens?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ExtractResult<T> {
  data: T;
  reasoning: string;
  metrics?: ExtractMetrics;
}

// ============================================================================
// ExtractService
// ============================================================================

export class ExtractService extends BaseService {
  /**
   * Extract structured data using a JSON Schema string.
   *
   * @example
   * ```typescript
   * const result = await client.extract.run<{ name: string }>(
   *   'Find the user name in the config file',
   *   JSON.stringify({ type: 'object', properties: { name: { type: 'string' } } })
   * );
   * console.log(result.data.name);
   * ```
   */
  async run<T = unknown>(
    prompt: string,
    jsonSchema: string,
    options: ExtractOptions = {}
  ): Promise<ExtractResult<T>> {
    const response = await this.call(() =>
      this.client.extract({
        prompt,
        jsonSchema,
        options: buildExtractOptions(options),
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Extraction failed');
    }

    let data: T;
    try {
      data = JSON.parse(response.resultJson) as T;
    } catch (e) {
      throw new CMDOPError(`Failed to parse extraction result: ${(e as Error).message}`);
    }

    return {
      data,
      reasoning: response.reasoning,
      metrics: response.metrics ? mapMetrics(response.metrics) : undefined,
    };
  }

  /**
   * Extract structured data using a Zod schema (recommended).
   * The schema is converted to JSON Schema automatically.
   * The result is validated against the schema and typed.
   *
   * @example
   * ```typescript
   * const ConfigSchema = z.object({
   *   host: z.string(),
   *   port: z.number(),
   * });
   *
   * const result = await client.extract.runSchema(
   *   'Find database config',
   *   ConfigSchema
   * );
   * console.log(result.data.host); // typed as string
   * ```
   */
  async runSchema<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options: ExtractOptions = {}
  ): Promise<ExtractResult<T>> {
    const jsonSchema = JSON.stringify(zodToJsonSchema(schema));
    const result = await this.run<unknown>(prompt, jsonSchema, options);

    const parsed = schema.safeParse(result.data);
    if (!parsed.success) {
      throw new CMDOPError(
        `Extraction result does not match schema: ${parsed.error.message}`
      );
    }

    return {
      data: parsed.data,
      reasoning: result.reasoning,
      metrics: result.metrics,
    };
  }
}

// ============================================================================
// Helpers
// ============================================================================

function buildExtractOptions(opts: ExtractOptions): ProtoExtractOptions {
  return {
    model: opts.model ?? '',
    temperature: opts.temperature ?? 0,
    maxTokens: opts.maxTokens ?? 0,
    maxRetries: opts.maxRetries ?? 0,
    timeoutSeconds: opts.timeoutSeconds ?? 0,
    workingDirectory: opts.workingDirectory ?? '',
    enabledTools: opts.enabledTools ?? [],
  };
}

function mapMetrics(m: ProtoExtractMetrics): ExtractMetrics {
  return {
    durationMs: m.durationMs,
    llmDurationMs: m.llmDurationMs,
    toolDurationMs: m.toolDurationMs,
    llmCalls: m.llmCalls,
    toolCalls: m.toolCalls,
    retries: m.retries,
    tokens: m.tokens ? mapTokenUsage(m.tokens) : undefined,
  };
}

function mapTokenUsage(t: ProtoExtractTokenUsage): ExtractMetrics['tokens'] {
  return {
    promptTokens: t.promptTokens,
    completionTokens: t.completionTokens,
    totalTokens: t.totalTokens,
  };
}
