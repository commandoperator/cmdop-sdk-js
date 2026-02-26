import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilesService } from '../../src/services/files';
import type { TerminalStreamingServiceClient } from '../../src/proto/generated/service';

// Create mock client
function createMockClient(): TerminalStreamingServiceClient {
  return {
    fileListDirectory: vi.fn(),
    fileRead: vi.fn(),
    fileWrite: vi.fn(),
    fileDelete: vi.fn(),
    fileGetInfo: vi.fn(),
    fileCreateDirectory: vi.fn(),
    fileMove: vi.fn(),
    fileCopy: vi.fn(),
    fileSearch: vi.fn(),
    fileCreateArchive: vi.fn(),
  } as unknown as TerminalStreamingServiceClient;
}

// Minimal StreamFileEntry mock with all required proto fields
function mockFileEntry(overrides: Record<string, unknown> = {}) {
  return {
    name: 'file.txt',
    path: '/tmp/file.txt',
    type: 1, // FILE
    size: '1024',
    permissions: 'rw-r--r--',
    owner: 'user',
    modifiedAt: new Date('2024-01-01'),
    isHidden: false,
    isReadable: true,
    isWritable: true,
    mimeType: 'text/plain',
    symlinkTarget: '',
    iconType: 0,
    isSystem: false,
    viewerType: 0,
    loadMethod: 0,
    mediaMetadata: undefined,
    ...overrides,
  };
}

describe('FilesService', () => {
  let client: TerminalStreamingServiceClient;
  let service: FilesService;

  beforeEach(() => {
    client = createMockClient();
    service = new FilesService(client);
    service.setSessionId('sess-123');
  });

  describe('list', () => {
    it('should list directory contents', async () => {
      vi.mocked(client.fileListDirectory).mockResolvedValue({
        success: true,
        error: '',
        result: {
          currentPath: '/tmp',
          entries: [mockFileEntry()],
          nextPageToken: '',
          totalCount: 1,
          hasMore: false,
        },
      });

      const result = await service.list('/tmp');

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]?.name).toBe('file.txt');
      expect(result.entries[0]?.type).toBe('file');
      expect(result.entries[0]?.size).toBe(1024);
    });

    it('should pass pagination options', async () => {
      vi.mocked(client.fileListDirectory).mockResolvedValue({
        success: true,
        error: '',
        result: { currentPath: '/tmp', entries: [], nextPageToken: '', totalCount: 0, hasMore: false },
      });

      await service.list('/tmp', {
        includeHidden: true,
        pageSize: 50,
        pageToken: 'token-abc',
      });

      expect(client.fileListDirectory).toHaveBeenCalledWith({
        sessionId: 'sess-123',
        path: '/tmp',
        includeHidden: true,
        pageSize: 50,
        pageToken: 'token-abc',
      });
    });
  });

  describe('read', () => {
    it('should read file contents', async () => {
      vi.mocked(client.fileRead).mockResolvedValue({
        success: true,
        error: '',
        result: {
          content: Buffer.from('Hello, World!'),
          encoding: 'utf-8',
          totalSize: '13',
          mimeType: 'text/plain',
          isTruncated: false,
          viewerType: 0,
          isTranscoded: false,
          transcodeComplete: false,
        },
      });

      const result = await service.read('/tmp/file.txt');

      expect(result.content.toString()).toBe('Hello, World!');
      expect(result.encoding).toBe('utf-8');
      expect(result.totalSize).toBe(13);
    });

    it('should pass offset and length options', async () => {
      vi.mocked(client.fileRead).mockResolvedValue({
        success: true,
        error: '',
        result: {
          content: Buffer.from('ello'),
          encoding: 'utf-8',
          totalSize: '13',
          mimeType: 'text/plain',
          isTruncated: true,
          viewerType: 0,
          isTranscoded: false,
          transcodeComplete: false,
        },
      });

      await service.read('/tmp/file.txt', { offset: 1, length: 4 });

      expect(client.fileRead).toHaveBeenCalledWith({
        sessionId: 'sess-123',
        path: '/tmp/file.txt',
        offset: '1',
        length: '4',
        transcode: false,
      });
    });
  });

  describe('write', () => {
    it('should write string content', async () => {
      vi.mocked(client.fileWrite).mockResolvedValue({
        success: true,
        error: '',
        result: {
          bytesWritten: '13',
          entry: undefined,
        },
      });

      const result = await service.write('/tmp/new.txt', 'Hello, World!');

      expect(result.bytesWritten).toBe(13);
    });

    it('should write Buffer content', async () => {
      vi.mocked(client.fileWrite).mockResolvedValue({
        success: true,
        error: '',
        result: { bytesWritten: '4', entry: undefined },
      });

      await service.write('/tmp/binary.bin', Buffer.from([0x00, 0x01, 0x02, 0x03]));

      expect(client.fileWrite).toHaveBeenCalled();
    });

    it('should pass write options', async () => {
      vi.mocked(client.fileWrite).mockResolvedValue({
        success: true,
        error: '',
        result: { bytesWritten: '5', entry: undefined },
      });

      await service.write('/tmp/file.txt', 'data', {
        overwrite: true,
        createParents: true,
      });

      expect(client.fileWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          overwrite: true,
          createParents: true,
        })
      );
    });
  });

  describe('delete', () => {
    it('should delete file', async () => {
      vi.mocked(client.fileDelete).mockResolvedValue({
        success: true,
        error: '',
        result: { filesDeleted: 1, dirsDeleted: 0, deletedPath: '/tmp/file.txt' },
      });

      const result = await service.delete('/tmp/file.txt');

      expect(result.filesDeleted).toBe(1);
      expect(result.dirsDeleted).toBe(0);
    });

    it('should delete directory recursively', async () => {
      vi.mocked(client.fileDelete).mockResolvedValue({
        success: true,
        error: '',
        result: { filesDeleted: 10, dirsDeleted: 3, deletedPath: '/tmp/dir' },
      });

      const result = await service.delete('/tmp/dir', { recursive: true });

      expect(client.fileDelete).toHaveBeenCalledWith({
        sessionId: 'sess-123',
        path: '/tmp/dir',
        recursive: true,
      });
      expect(result.filesDeleted).toBe(10);
      expect(result.dirsDeleted).toBe(3);
    });
  });

  describe('stat', () => {
    it('should get file info', async () => {
      vi.mocked(client.fileGetInfo).mockResolvedValue({
        success: true,
        error: '',
        result: {
          entry: mockFileEntry({
            path: '/tmp/file.txt',
            size: '2048',
            permissions: 'rw-r--r--',
            owner: 'root',
            modifiedAt: new Date('2024-01-15'),
            isWritable: false,
          }),
        },
      });

      const result = await service.stat('/tmp/file.txt');

      expect(result.name).toBe('file.txt');
      expect(result.size).toBe(2048);
      expect(result.isWritable).toBe(false);
    });
  });

  describe('mkdir', () => {
    it('should create directory', async () => {
      vi.mocked(client.fileCreateDirectory).mockResolvedValue({
        success: true,
        error: '',
        result: {
          entry: mockFileEntry({
            name: 'newdir',
            path: '/tmp/newdir',
            type: 2, // DIRECTORY
            size: '0',
            permissions: 'rwxr-xr-x',
            mimeType: 'inode/directory',
          }),
        },
      });

      const result = await service.mkdir('/tmp/newdir');

      expect(result.type).toBe('directory');
    });

    it('should create nested directories', async () => {
      vi.mocked(client.fileCreateDirectory).mockResolvedValue({
        success: true,
        error: '',
        result: {
          entry: mockFileEntry({
            name: 'deep',
            path: '/tmp/a/b/c/deep',
            type: 2,
            size: '0',
            permissions: 'rwxr-xr-x',
            mimeType: 'inode/directory',
          }),
        },
      });

      await service.mkdir('/tmp/a/b/c/deep', { recursive: true });

      expect(client.fileCreateDirectory).toHaveBeenCalledWith({
        sessionId: 'sess-123',
        path: '/tmp/a/b/c/deep',
        createParents: true,
      });
    });
  });

  describe('move', () => {
    it('should move file', async () => {
      vi.mocked(client.fileMove).mockResolvedValue({
        success: true,
        error: '',
        result: {
          entry: mockFileEntry({
            name: 'renamed.txt',
            path: '/tmp/renamed.txt',
          }),
        },
      });

      const result = await service.move('/tmp/old.txt', '/tmp/renamed.txt');

      expect(result.path).toBe('/tmp/renamed.txt');
    });
  });

  describe('copy', () => {
    it('should copy file', async () => {
      vi.mocked(client.fileCopy).mockResolvedValue({
        success: true,
        error: '',
        result: {
          entry: mockFileEntry({
            name: 'copy.txt',
            path: '/tmp/copy.txt',
          }),
          bytesCopied: '100',
        },
      });

      const result = await service.copy('/tmp/original.txt', '/tmp/copy.txt');

      expect(result.entry.path).toBe('/tmp/copy.txt');
      expect(result.bytesCopied).toBe(100);
    });
  });

  describe('search', () => {
    it('should search for files', async () => {
      vi.mocked(client.fileSearch).mockResolvedValue({
        success: true,
        error: '',
        result: {
          matches: [
            {
              entry: mockFileEntry({
                name: 'test.ts',
                path: '/src/test.ts',
                mimeType: 'text/typescript',
              }),
              matchType: 1,
              contentMatches: [],
            },
          ],
          totalMatches: 1,
          truncated: false,
          searchPath: '/src',
          filesScanned: '100',
          durationMs: '50',
        },
      });

      const result = await service.search('/src', { pattern: '*.ts' });

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('test.ts');
    });
  });

  describe('archive', () => {
    it('should create archive', async () => {
      vi.mocked(client.fileCreateArchive).mockResolvedValue({
        success: true,
        error: '',
        result: {
          entry: mockFileEntry({
            name: 'backup.zip',
            path: '/tmp/backup.zip',
            size: '10240',
            mimeType: 'application/zip',
          }),
          bytesArchived: '10240',
          filesArchived: 2,
          dirsArchived: 0,
        },
      });

      const result = await service.archive(
        ['/src/file1.ts', '/src/file2.ts'],
        '/tmp/backup.zip'
      );

      expect(result.name).toBe('backup.zip');
      expect(result.mimeType).toBe('application/zip');
    });
  });
});
