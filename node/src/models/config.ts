/**
 * Config models — Zod schemas for connection and retry configuration
 */

import { z } from 'zod/v4';
import { sdkObject } from './base';

export const ConnectionConfigSchema = sdkObject({
  connectTimeoutMs: z.number().int().positive(),
  requestTimeoutMs: z.number().int().positive(),
  maxMessageSize: z.number().int().positive(),
  grpcServer: z.string().min(1),
  apiBaseUrl: z.string().url(),
});

export type ConnectionConfig = z.infer<typeof ConnectionConfigSchema>;

export const RetryConfigSchema = sdkObject({
  retryAttempts: z.number().int().min(0).max(20),
  retryTimeoutMs: z.number().int().positive(),
});

export type RetryConfig = z.infer<typeof RetryConfigSchema>;

export const KeepaliveConfigSchema = sdkObject({
  keepaliveIntervalMs: z.number().int().positive(),
  queueMaxSize: z.number().int().positive(),
});

export type KeepaliveConfig = z.infer<typeof KeepaliveConfigSchema>;

export const CircuitBreakerConfigSchema = sdkObject({
  circuitBreakerFailMax: z.number().int().positive(),
  circuitBreakerResetMs: z.number().int().positive(),
});

export type CircuitBreakerConfig = z.infer<typeof CircuitBreakerConfigSchema>;
