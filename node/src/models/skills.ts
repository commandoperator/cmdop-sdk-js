/**
 * Skills models — Zod schemas and inferred types
 */

import { z } from 'zod/v4';
import { sdkObject } from './base';
import { ToolResultSchema, UsageSchema } from './agent';

// ── Skill info ─────────────────────────────────────────────────────────────

export const SkillInfoSchema = sdkObject({
  name: z.string(),
  description: z.string(),
  author: z.string(),
  version: z.string(),
  model: z.string(),
  origin: z.string(),
  requiredBins: z.array(z.string()),
  requiredEnv: z.array(z.string()),
});

export type SkillInfo = z.infer<typeof SkillInfoSchema>;

// ── Skill detail ───────────────────────────────────────────────────────────

export const SkillDetailSchema = sdkObject({
  found: z.boolean(),
  info: SkillInfoSchema.optional(),
  content: z.string(),
  source: z.string(),
  error: z.string().optional(),
});

export type SkillDetail = z.infer<typeof SkillDetailSchema>;

// ── Skill run options ──────────────────────────────────────────────────────

export const SkillRunOptionsSchema = sdkObject({
  model: z.string().optional(),
  timeoutSeconds: z.number().int().positive().max(600).optional(),
  options: z.record(z.string(), z.string()).optional(),
});

export type SkillRunOptions = z.infer<typeof SkillRunOptionsSchema>;

// ── Skill run result ───────────────────────────────────────────────────────

export const SkillRunResultSchema = sdkObject({
  requestId: z.string(),
  success: z.boolean(),
  text: z.string(),
  error: z.string().optional(),
  toolResults: z.array(ToolResultSchema),
  usage: UsageSchema.optional(),
  durationMs: z.number().int().min(0),
  outputJson: z.string().optional(),
});

export type SkillRunResult = z.infer<typeof SkillRunResultSchema>;
