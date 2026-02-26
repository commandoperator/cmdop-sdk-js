import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DownloadService } from '../../src/services/download';
import type { TerminalStreamingServiceClient } from '../../src/proto/generated/service';

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

function createMockClient(): TerminalStreamingServiceClient {
  return {
    fileRead: vi.fn(),
    fileDelete: vi.fn().mockResolvedValue({ success: true, error: '', result: null }),
    runAgent: vi.fn(),
  } as unknown as TerminalStreamingServiceClient;
}

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cmdop-dl-test-'));
}

// ──────────────────────────────────────────────────────────────────
// downloadFile
// ──────────────────────────────────────────────────────────────────

describe('DownloadService.downloadFile', () => {
  let client: TerminalStreamingServiceClient;
  let service: DownloadService;
  let tmpDir: string;

  beforeEach(() => {
    client = createMockClient();
    service = new DownloadService(client);
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('downloads a small file in a single chunk', async () => {
    const content = Buffer.from('hello world');
    vi.mocked(client.fileRead).mockResolvedValue({
      success: true,
      error: '',
      result: {
        content,
        encoding: 'binary',
        totalSize: String(content.length),
        isTruncated: false,
        viewerType: 0,
        mimeType: '',        isTranscoded: false,
        transcodeComplete: false,
      },
    });

    const localPath = path.join(tmpDir, 'out.txt');
    const result = await service.downloadFile('/remote/file.txt', localPath);

    expect(result.success).toBe(true);
    expect(result.localPath).toBe(localPath);
    expect(result.size).toBe(content.length);
    expect(fs.readFileSync(localPath)).toEqual(content);
  });

  it('downloads a file in multiple chunks', async () => {
    const part1 = Buffer.from('hello ');
    const part2 = Buffer.from('world');
    const total = part1.length + part2.length;

    vi.mocked(client.fileRead)
      // First call: offset 0 — returns part1 and marks isTruncated=true
      .mockResolvedValueOnce({
        success: true,
        error: '',
        result: {
          content: part1,
          encoding: 'binary',
          totalSize: String(total),
          isTruncated: true,
          viewerType: 0,
          mimeType: '',
          isTranscoded: false,
          transcodeComplete: false,
        },
      })
      // Second call: offset 6 — returns part2 and marks isTruncated=false
      .mockResolvedValueOnce({
        success: true,
        error: '',
        result: {
          content: part2,
          encoding: 'binary',
          totalSize: String(total),
          isTruncated: false,
          viewerType: 0,
          mimeType: '',
          isTranscoded: false,
          transcodeComplete: false,
        },
      });

    const localPath = path.join(tmpDir, 'out.txt');
    const result = await service.downloadFile('/remote/file.txt', localPath, {
      chunkSize: part1.length,
    });

    expect(result.success).toBe(true);
    expect(result.size).toBe(total);
    expect(fs.readFileSync(localPath).toString()).toBe('hello world');
    expect(result.metrics?.chunksCount).toBe(2);
  });

  it('returns error result when fileRead fails', async () => {
    vi.mocked(client.fileRead).mockRejectedValue(new Error('connection lost'));

    const localPath = path.join(tmpDir, 'out.txt');
    const result = await service.downloadFile('/remote/file.txt', localPath);

    expect(result.success).toBe(false);
    expect(result.error).toContain('connection lost');
    expect(fs.existsSync(localPath)).toBe(false); // partial file cleaned up
  });

  it('retries on transient failure and succeeds', async () => {
    const content = Buffer.from('ok');
    vi.mocked(client.fileRead)
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue({
        success: true,
        error: '',
        result: {
          content,
          encoding: 'binary',
          totalSize: String(content.length),
          isTruncated: false,
          viewerType: 0,
          mimeType: '',
          isTranscoded: false,
          transcodeComplete: false,
        },
      });

    const localPath = path.join(tmpDir, 'out.txt');
    const result = await service.downloadFile('/remote/file.txt', localPath, { maxRetries: 1 });

    expect(result.success).toBe(true);
    expect(result.metrics?.retriesCount).toBe(1);
  });

  it('fails after exhausting retries', async () => {
    vi.mocked(client.fileRead).mockRejectedValue(new Error('always fails'));

    const localPath = path.join(tmpDir, 'out.txt');
    const result = await service.downloadFile('/remote/file.txt', localPath, { maxRetries: 2 });

    expect(result.success).toBe(false);
    // 3 calls: attempt 0 + 2 retries
    expect(client.fileRead).toHaveBeenCalledTimes(3);
  });

  it('calls onProgress after each chunk', async () => {
    const content = Buffer.from('abc');
    vi.mocked(client.fileRead).mockResolvedValue({
      success: true,
      error: '',
      result: {
        content,
        encoding: 'binary',
        totalSize: String(content.length),
        isTruncated: false,
        viewerType: 0,
        mimeType: '',        isTranscoded: false,
        transcodeComplete: false,
      },
    });

    const progress: Array<[number, number]> = [];
    const localPath = path.join(tmpDir, 'out.txt');
    await service.downloadFile('/remote/file.txt', localPath, {
      onProgress: (n, total) => progress.push([n, total]),
    });

    expect(progress.length).toBeGreaterThan(0);
    expect(progress[0]).toEqual([3, 3]);
  });

  it('creates parent directories if they do not exist', async () => {
    const content = Buffer.from('x');
    vi.mocked(client.fileRead).mockResolvedValue({
      success: true,
      error: '',
      result: {
        content,
        encoding: 'binary',
        totalSize: '1',
        isTruncated: false,
        viewerType: 0,
        mimeType: '',        isTranscoded: false,
        transcodeComplete: false,
      },
    });

    const localPath = path.join(tmpDir, 'nested', 'dir', 'out.txt');
    const result = await service.downloadFile('/remote/file.txt', localPath);

    expect(result.success).toBe(true);
    expect(fs.existsSync(localPath)).toBe(true);
  });

  it('includes transfer speed in metrics', async () => {
    const content = Buffer.from('a'.repeat(1024));
    vi.mocked(client.fileRead).mockResolvedValue({
      success: true,
      error: '',
      result: {
        content,
        encoding: 'binary',
        totalSize: String(content.length),
        isTruncated: false,
        viewerType: 0,
        mimeType: '',        isTranscoded: false,
        transcodeComplete: false,
      },
    });

    const localPath = path.join(tmpDir, 'out.txt');
    const result = await service.downloadFile('/remote/file.txt', localPath);

    expect(result.metrics).toBeDefined();
    expect(result.metrics!.transferredBytes).toBe(1024);
    expect(result.metrics!.remoteSizeBytes).toBe(1024);
  });

  it('respects sessionId option over service-level sessionId', async () => {
    const content = Buffer.from('x');
    vi.mocked(client.fileRead).mockResolvedValue({
      success: true,
      error: '',
      result: {
        content,
        encoding: 'binary',
        totalSize: '1',
        isTruncated: false,
        viewerType: 0,
        mimeType: '',        isTranscoded: false,
        transcodeComplete: false,
      },
    });

    service.setSessionId('default-session');

    const localPath = path.join(tmpDir, 'out.txt');
    await service.downloadFile('/remote/file.txt', localPath, {
      sessionId: 'override-session',
    });

    expect(client.fileRead).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'override-session' })
    );
  });
});

// ──────────────────────────────────────────────────────────────────
// downloadUrl
// ──────────────────────────────────────────────────────────────────

describe('DownloadService.downloadUrl', () => {
  let client: TerminalStreamingServiceClient;
  let service: DownloadService;
  let tmpDir: string;

  beforeEach(() => {
    client = createMockClient();
    service = new DownloadService(client);
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('calls runAgent with curl command and then downloads the temp file', async () => {
    const content = Buffer.from('downloaded');
    vi.mocked(client.runAgent).mockResolvedValue({
      success: true,
      requestId: 'r1',
      text: 'done',
      error: '',
      toolResults: [],
      usage: undefined,
      durationMs: '100',
      outputJson: '',
    });
    vi.mocked(client.fileRead).mockResolvedValue({
      success: true,
      error: '',
      result: {
        content,
        encoding: 'binary',
        totalSize: String(content.length),
        isTruncated: false,
        viewerType: 0,
        mimeType: '',        isTranscoded: false,
        transcodeComplete: false,
      },
    });

    const localPath = path.join(tmpDir, 'out.txt');
    const result = await service.downloadUrl('https://example.com/file.txt', localPath, {
      remoteTempPath: '/tmp/temp_file.txt',
    });

    expect(client.runAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('https://example.com/file.txt'),
      })
    );
    expect(result.success).toBe(true);
    expect(result.size).toBe(content.length);
  });

  it('cleans up remote temp file after download', async () => {
    const content = Buffer.from('x');
    vi.mocked(client.runAgent).mockResolvedValue({
      success: true,
      requestId: '',
      text: '',
      error: '',
      toolResults: [],
      usage: undefined,
      durationMs: '0',
      outputJson: '',
    });
    vi.mocked(client.fileRead).mockResolvedValue({
      success: true,
      error: '',
      result: {
        content,
        encoding: 'binary',
        totalSize: '1',
        isTruncated: false,
        viewerType: 0,
        mimeType: '',        isTranscoded: false,
        transcodeComplete: false,
      },
    });

    const localPath = path.join(tmpDir, 'out.txt');
    await service.downloadUrl('https://example.com/file.txt', localPath, {
      remoteTempPath: '/tmp/temp.txt',
      cleanup: true,
    });

    expect(client.fileDelete).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/tmp/temp.txt' })
    );
  });

  it('does not clean up when cleanup: false', async () => {
    const content = Buffer.from('x');
    vi.mocked(client.runAgent).mockResolvedValue({
      success: true,
      requestId: '',
      text: '',
      error: '',
      toolResults: [],
      usage: undefined,
      durationMs: '0',
      outputJson: '',
    });
    vi.mocked(client.fileRead).mockResolvedValue({
      success: true,
      error: '',
      result: {
        content,
        encoding: 'binary',
        totalSize: '1',
        isTruncated: false,
        viewerType: 0,
        mimeType: '',        isTranscoded: false,
        transcodeComplete: false,
      },
    });

    const localPath = path.join(tmpDir, 'out.txt');
    await service.downloadUrl('https://example.com/file.txt', localPath, {
      remoteTempPath: '/tmp/temp.txt',
      cleanup: false,
    });

    expect(client.fileDelete).not.toHaveBeenCalled();
  });

  it('returns error when agent download fails', async () => {
    vi.mocked(client.runAgent).mockResolvedValue({
      success: false,
      requestId: '',
      text: '',
      error: 'curl not found',
      toolResults: [],
      usage: undefined,
      durationMs: '0',
      outputJson: '',
    });

    const localPath = path.join(tmpDir, 'out.txt');
    const result = await service.downloadUrl('https://example.com/file.txt', localPath);

    expect(result.success).toBe(false);
    expect(result.error).toContain('curl not found');
  });
});
