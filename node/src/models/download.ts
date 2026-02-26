/**
 * Models for DownloadService
 */

import { z } from '../schema';

export const DownloadMetricsSchema = z.object({
  totalTimeMs: z.number(),
  transferSpeedMbps: z.number(),
  chunksCount: z.number(),
  retriesCount: z.number(),
  remoteSizeBytes: z.number(),
  transferredBytes: z.number(),
});

export type DownloadMetrics = z.infer<typeof DownloadMetricsSchema>;

export const DownloadResultSchema = z.object({
  success: z.boolean(),
  localPath: z.string().optional(),
  size: z.number(),
  error: z.string().optional(),
  metrics: DownloadMetricsSchema.optional(),
});

export type DownloadResult = z.infer<typeof DownloadResultSchema>;

export interface DownloadFileOptions {
  /** Session ID override (defaults to service sessionId) */
  sessionId?: string;
  /** Bytes per chunk (default: 4MB) */
  chunkSize?: number;
  /** Maximum retry attempts per chunk (default: 3) */
  maxRetries?: number;
  /** Progress callback — called after each chunk */
  onProgress?: (transferred: number, total: number) => void;
}

export interface DownloadUrlOptions extends DownloadFileOptions {
  /**
   * Temp path on the remote agent to download the URL to before transferring.
   * Defaults to a path in /tmp.
   */
  remoteTempPath?: string;
  /**
   * Whether to delete the remote temp file after download (default: true).
   */
  cleanup?: boolean;
}
