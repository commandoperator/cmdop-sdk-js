/**
 * Terminal models — Zod schemas and inferred types
 */

import { z } from 'zod/v4';
import { sdkObject } from './base';

// ── Session state ──────────────────────────────────────────────────────────

export const SessionStateSchema = z.enum([
  'connected',
  'disconnected',
  'error',
  'unknown',
]);

export type SessionState = z.infer<typeof SessionStateSchema>;

// ── Create options ─────────────────────────────────────────────────────────

export const CreateSessionOptionsSchema = sdkObject({
  name: z.string().optional(),
  shell: z.string().optional(),
  workingDir: z.string().optional(),
  cols: z.number().int().positive().optional(),
  rows: z.number().int().positive().optional(),
  env: z.record(z.string(), z.string()).optional(),
});

export type CreateSessionOptions = z.infer<typeof CreateSessionOptionsSchema>;

// ── List options ───────────────────────────────────────────────────────────

export const ListSessionsOptionsSchema = sdkObject({
  hostname: z.string().optional(),
  status: z.string().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().min(0).optional(),
});

export type ListSessionsOptions = z.infer<typeof ListSessionsOptionsSchema>;

// ── Session info ───────────────────────────────────────────────────────────

export const SessionInfoSchema = sdkObject({
  sessionId: z.string(),
  shell: z.string().optional(),
  workingDir: z.string().optional(),
  hostname: z.string().optional(),
  machineName: z.string().optional(),
  status: z.string(),
  os: z.string().optional(),
  agentVersion: z.string().optional(),
  hasShell: z.boolean().optional(),
  connectedAt: z.date().optional(),
});

export type SessionInfo = z.infer<typeof SessionInfoSchema>;

// ── Session status ─────────────────────────────────────────────────────────

export const SessionStatusInfoSchema = sdkObject({
  exists: z.boolean(),
  status: z.string(),
  hostname: z.string(),
  connectedAt: z.date().optional(),
  lastHeartbeat: z.date().optional(),
  commandsCount: z.number().int().min(0),
});

export type SessionStatusInfo = z.infer<typeof SessionStatusInfoSchema>;

// ── Set machine result ─────────────────────────────────────────────────────

export const SetMachineResultSchema = sdkObject({
  sessionId: z.string(),
  hostname: z.string(),
  machineName: z.string(),
  status: z.string(),
  os: z.string().optional(),
  agentVersion: z.string().optional(),
  hasShell: z.boolean().optional(),
  shell: z.string().optional(),
  workingDir: z.string().optional(),
  connectedAt: z.date().optional(),
  heartbeatAgeSeconds: z.number().optional(),
});

export type SetMachineResult = z.infer<typeof SetMachineResultSchema>;

// ── Output chunk (for future streaming) ───────────────────────────────────

export const OutputChunkSchema = sdkObject({
  sessionId: z.string(),
  data: z.instanceof(Uint8Array),
  timestamp: z.date().optional(),
});

export type OutputChunk = z.infer<typeof OutputChunkSchema>;
