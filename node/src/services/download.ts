/**
 * DownloadService — transfer files from a remote agent to local disk.
 *
 * Two modes:
 *   downloadFile(remotePath, localPath)  — reads a remote file in chunks via fileRead RPC
 *   downloadUrl(url, localPath)          — agent downloads URL first, then SDK reads it back
 *
 * Both modes write to the local Node.js filesystem.
 */

import * as fs from 'fs';
import * as path from 'path';
import { CMDOPError } from '@cmdop/core';
import { AgentType } from '../proto/generated/control_messages';
import { BaseService } from './base';
import { mapGrpcError } from '../errors';
import type {
  DownloadResult,
  DownloadFileOptions,
  DownloadUrlOptions,
} from '../models/download';

export type {
  DownloadResult,
  DownloadMetrics,
  DownloadFileOptions,
  DownloadUrlOptions,
} from '../models/download';

/** Default chunk size: 4 MB */
const DEFAULT_CHUNK_SIZE = 4 * 1024 * 1024;

export class DownloadService extends BaseService {
  /**
   * Download a file from the remote agent to local disk.
   *
   * Reads the file in chunks using the fileRead RPC and writes them
   * incrementally to localPath.
   *
   * @param remotePath  Absolute path on the remote agent
   * @param localPath   Absolute or relative path on the local machine
   * @param options     Chunk size, retry, progress callback
   *
   * @example
   * ```typescript
   * const result = await client.download.downloadFile(
   *   '/home/user/data.csv',
   *   '/tmp/data.csv',
   *   { onProgress: (n, total) => console.log(`${n}/${total}`) }
   * );
   * console.log(`Downloaded ${result.size} bytes to ${result.localPath}`);
   * ```
   */
  async downloadFile(
    remotePath: string,
    localPath: string,
    options: DownloadFileOptions = {}
  ): Promise<DownloadResult> {
    const startMs = Date.now();
    const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
    const maxRetries = options.maxRetries ?? 3;
    const sessionId = options.sessionId ?? this._sessionId;

    const absLocal = path.resolve(localPath);

    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(absLocal), { recursive: true });

    let fd: number | null = null;
    let offset = 0;
    let totalSize = 0;
    let chunksCount = 0;
    let retriesCount = 0;

    try {
      // First read to discover totalSize
      const firstChunk = await this._readChunkWithRetry(
        remotePath,
        sessionId,
        0,
        chunkSize,
        maxRetries,
        () => retriesCount++
      );

      totalSize = firstChunk.totalSize;
      fd = fs.openSync(absLocal, 'w');

      // Write first chunk
      if (firstChunk.data.length > 0) {
        fs.writeSync(fd, firstChunk.data, 0, firstChunk.data.length, 0);
        offset = firstChunk.data.length;
        chunksCount++;
        options.onProgress?.(offset, totalSize);
      }

      // Read remaining chunks
      while (offset < totalSize) {
        const chunk = await this._readChunkWithRetry(
          remotePath,
          sessionId,
          offset,
          chunkSize,
          maxRetries,
          () => retriesCount++
        );

        if (chunk.data.length === 0) break;

        fs.writeSync(fd, chunk.data, 0, chunk.data.length, offset);
        offset += chunk.data.length;
        chunksCount++;
        options.onProgress?.(offset, totalSize);

        if (!chunk.isTruncated) break;
      }

      const totalTimeMs = Date.now() - startMs;

      return {
        success: true,
        localPath: absLocal,
        size: offset,
        metrics: {
          totalTimeMs,
          transferSpeedMbps: totalTimeMs > 0 ? (offset / 1024 / 1024) / (totalTimeMs / 1000) : 0,
          chunksCount,
          retriesCount,
          remoteSizeBytes: totalSize,
          transferredBytes: offset,
        },
      };
    } catch (err) {
      // Clean up partial file on error
      if (fd !== null) {
        try { fs.closeSync(fd); fd = null; } catch { /* ignore */ }
        try { fs.unlinkSync(absLocal); } catch { /* ignore */ }
      }

      const mapped = mapGrpcError(err);
      return {
        success: false,
        size: offset,
        error: mapped.message,
        metrics: {
          totalTimeMs: Date.now() - startMs,
          transferSpeedMbps: 0,
          chunksCount,
          retriesCount,
          remoteSizeBytes: totalSize,
          transferredBytes: offset,
        },
      };
    } finally {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch { /* ignore */ }
      }
    }
  }

  /**
   * Download a URL to local disk.
   *
   * The agent downloads the URL to a temporary file on its filesystem using
   * curl, then the SDK transfers that file to local disk via `downloadFile`.
   *
   * Requires curl to be available on the remote agent.
   *
   * @param url          HTTP/HTTPS URL to download
   * @param localPath    Absolute or relative path on the local machine
   * @param options      Chunk size, retry, temp path, cleanup flag
   *
   * @example
   * ```typescript
   * const result = await client.download.downloadUrl(
   *   'https://example.com/data.csv',
   *   '/tmp/data.csv'
   * );
   * ```
   */
  async downloadUrl(
    url: string,
    localPath: string,
    options: DownloadUrlOptions = {}
  ): Promise<DownloadResult> {
    const startMs = Date.now();
    const sessionId = options.sessionId ?? this._sessionId;
    const cleanup = options.cleanup ?? true;

    // Derive safe temp filename from URL
    const urlFilename = url.split('/').pop()?.split('?')[0] || 'download';
    const safeName = urlFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const remoteTempPath = options.remoteTempPath
      ?? `/tmp/.cmdop_dl_${Date.now()}_${safeName}`;

    // Step 1: Ask agent to curl the URL to remoteTempPath
    try {
      await this._runRemoteCurl(url, remoteTempPath, sessionId);
    } catch (err) {
      const mapped = mapGrpcError(err);
      return {
        success: false,
        size: 0,
        error: `Failed to download URL on agent: ${mapped.message}`,
        metrics: {
          totalTimeMs: Date.now() - startMs,
          transferSpeedMbps: 0,
          chunksCount: 0,
          retriesCount: 0,
          remoteSizeBytes: 0,
          transferredBytes: 0,
        },
      };
    }

    // Step 2: Transfer the file from agent to local disk
    const result = await this.downloadFile(remoteTempPath, localPath, {
      ...options,
      sessionId,
    });

    // Step 3: Cleanup temp file on agent
    if (cleanup) {
      try {
        await this.call(() =>
          this.client.fileDelete({
            sessionId,
            path: remoteTempPath,
            recursive: false,
          })
        );
      } catch {
        // Non-fatal — local file already saved
      }
    }

    return result;
  }

  // ──────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────

  private async _readChunkWithRetry(
    remotePath: string,
    sessionId: string,
    offset: number,
    length: number,
    maxRetries: number,
    onRetry: () => void
  ): Promise<{ data: Buffer; totalSize: number; isTruncated: boolean }> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        onRetry();
        // Exponential backoff: 200ms, 400ms, 800ms
        await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt - 1)));
      }

      try {
        const response = await this.client.fileRead({
          sessionId,
          path: remotePath,
          offset: String(offset),
          length: String(length),
          transcode: false,
        });

        if (!response.success) {
          throw new CMDOPError(response.error || 'Failed to read file chunk');
        }

        const result = response.result!;
        return {
          data: Buffer.from(result.content),
          totalSize: parseInt(result.totalSize, 10),
          isTruncated: result.isTruncated,
        };
      } catch (err) {
        lastError = err;
        // Don't retry on the last attempt
        if (attempt === maxRetries) break;
      }
    }

    throw lastError;
  }

  private async _runRemoteCurl(
    url: string,
    destPath: string,
    sessionId: string
  ): Promise<void> {
    // Write a shell command to a temp script path and execute it via fileWrite + session
    // Simplest approach: use the fileWrite RPC to write output directly via curl piped to agent
    // But fileWrite requires data in memory — not suitable for large files.
    //
    // Best approach: write a tiny shell script, then use sendInput on any active session.
    // However DownloadService doesn't have terminal access by default.
    //
    // We use fileWrite with a shell script + exec pattern:
    // Write script to /tmp, then read its output is not available via plain fileWrite.
    //
    // Practical approach: use the agent RPC to run a command if available,
    // otherwise use fileWrite to write a Python/shell one-liner that downloads via urllib.
    //
    // Since we have the gRPC client directly, use fileWrite to create a script,
    // then read the result — but this requires running it.
    //
    // The cleanest approach for the Node.js SDK (without requiring a terminal session):
    // Use runAgent with the terminal agent type to execute the curl command.
    //
    // Alternative: use the runAgent RPC directly.
    const response = await this.call(() =>
      this.client.runAgent({
        sessionId,
        prompt: `Download the URL "${url}" to "${destPath}" using curl or wget. Run: curl -fsSL -o "${destPath}" "${url}" || wget -q -O "${destPath}" "${url}"`,
        requestId: '',
        agentType: AgentType.AGENT_TYPE_COMMAND,
        timeoutSeconds: 120,
        options: {},
        outputSchema: '',
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || `Failed to download URL: ${url}`);
    }
  }
}
