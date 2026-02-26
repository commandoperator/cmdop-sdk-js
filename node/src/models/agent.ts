/**
 * Agent models — Zod schemas and inferred types
 */

import { z } from 'zod/v4';
import { sdkObject } from './base';

// ── Agent mode ─────────────────────────────────────────────────────────────

export const AgentModeSchema = z.enum([
  'chat',
  'terminal',
  'command',
  'router',
  'planner',
  'browser',
  'scraper',
  'form_filler',
]);
export type AgentMode = z.infer<typeof AgentModeSchema>;

// ── Run options ────────────────────────────────────────────────────────────

export const RunAgentOptionsSchema = sdkObject({
  mode: AgentModeSchema.optional(),
  timeoutSeconds: z.number().int().positive().max(600).optional(),
  /** Maximum number of agentic turns (tool calls) before stopping */
  maxTurns: z.number().int().positive().optional(),
  /** Maximum number of retries on transient agent errors */
  maxRetries: z.number().int().min(0).optional(),
  /** Model to use (e.g. "claude-opus-4-6", "claude-sonnet-4-6") */
  model: z.string().optional(),
  options: z.record(z.string(), z.string()).optional(),
  outputSchema: z.string().optional(),
  requestId: z.string().optional(),
});

export type RunAgentOptions = z.infer<typeof RunAgentOptionsSchema>;

// ── Tool result ────────────────────────────────────────────────────────────

export const ToolResultSchema = sdkObject({
  toolName: z.string(),
  toolCallId: z.string(),
  success: z.boolean(),
  result: z.string(),
  error: z.string().optional(),
  durationMs: z.number().int().min(0),
});

export type ToolResult = z.infer<typeof ToolResultSchema>;

// ── Usage ──────────────────────────────────────────────────────────────────

export const UsageSchema = sdkObject({
  promptTokens: z.number().int().min(0),
  completionTokens: z.number().int().min(0),
  totalTokens: z.number().int().min(0),
});

export type Usage = z.infer<typeof UsageSchema>;

// ── Agent result ───────────────────────────────────────────────────────────

export const AgentResultSchema = sdkObject({
  requestId: z.string(),
  success: z.boolean(),
  text: z.string(),
  error: z.string().optional(),
  toolResults: z.array(ToolResultSchema),
  usage: UsageSchema.optional(),
  durationMs: z.number().int().min(0),
  outputJson: z.string().optional(),
});

export type AgentResult = z.infer<typeof AgentResultSchema>;
