/**
 * Files service for file operations on remote agent
 *
 * For local IPC, sessionId is not required (server ignores it).
 * For remote connections, use setSessionId() to set the active session.
 *
 * Example:
 *   // Local IPC - just use methods directly
 *   const files = await client.files.list('/tmp');
 *
 *   // Remote - set session first
 *   client.files.setSessionId(session.sessionId);
 *   const files = await client.files.list('/tmp');
 */

import { CMDOPError } from '@cmdop/core';
import type { TerminalStreamingServiceClient } from '../generated/service';
import type { StreamFileEntry, StreamFileType } from '../generated/file_operations/common';

/**
 * File entry returned from list/stat operations
 */
export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size: number;
  permissions: string;
  owner: string;
  modifiedAt?: Date;
  isHidden: boolean;
  isReadable: boolean;
  isWritable: boolean;
  mimeType: string;
  symlinkTarget?: string;
}

/**
 * Options for listing directory
 */
export interface ListOptions {
  includeHidden?: boolean;
  pageSize?: number;
  pageToken?: string;
}

/**
 * Result from list operation
 */
export interface ListResult {
  entries: FileEntry[];
  nextPageToken?: string;
  totalCount: number;
}

/**
 * Options for reading file
 */
export interface ReadOptions {
  offset?: number;
  length?: number;
}

/**
 * Result from read operation
 */
export interface ReadResult {
  content: Buffer;
  encoding: string;
  totalSize: number;
  mimeType: string;
  isTruncated: boolean;
}

/**
 * Options for writing file
 */
export interface WriteOptions {
  overwrite?: boolean;
  createParents?: boolean;
}

/**
 * Options for delete operation
 */
export interface DeleteOptions {
  recursive?: boolean;
}

/**
 * Options for copy operation
 */
export interface CopyOptions {
  overwrite?: boolean;
  recursive?: boolean;
}

/**
 * Options for move operation
 */
export interface MoveOptions {
  overwrite?: boolean;
}

/**
 * Options for search operation
 */
export interface SearchOptions {
  pattern: string;
  recursive?: boolean;
  includeHidden?: boolean;
  maxResults?: number;
}

/**
 * Files service for file operations
 *
 * @example Local IPC (no session needed)
 * ```typescript
 * const files = await client.files.list('/tmp');
 * const content = await client.files.read('/etc/hosts');
 * ```
 *
 * @example Remote (session required)
 * ```typescript
 * client.files.setSessionId(session.sessionId);
 * const files = await client.files.list('/tmp');
 * ```
 */
export class FilesService {
  private _sessionId: string = '';

  constructor(private readonly client: TerminalStreamingServiceClient) {}

  /**
   * Set session ID for remote operations.
   * Not needed for local IPC.
   */
  setSessionId(sessionId: string): void {
    this._sessionId = sessionId;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this._sessionId;
  }

  /**
   * List directory contents
   */
  async list(path: string, options: ListOptions = {}): Promise<ListResult> {
    const response = await this.client.fileListDirectory({
      sessionId: this._sessionId,
      path,
      includeHidden: options.includeHidden ?? false,
      pageSize: options.pageSize ?? 100,
      pageToken: options.pageToken ?? '',
    });

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to list directory');
    }

    const result = response.result!;
    return {
      entries: result.entries.map(mapFileEntry),
      nextPageToken: result.nextPageToken || undefined,
      totalCount: result.totalCount,
    };
  }

  /**
   * Read file contents
   */
  async read(path: string, options: ReadOptions = {}): Promise<ReadResult> {
    const response = await this.client.fileRead({
      sessionId: this._sessionId,
      path,
      offset: String(options.offset ?? 0),
      length: String(options.length ?? 0),
      transcode: false,
    });

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to read file');
    }

    const result = response.result!;
    return {
      content: Buffer.from(result.content),
      encoding: result.encoding,
      totalSize: parseInt(result.totalSize, 10),
      mimeType: result.mimeType,
      isTruncated: result.isTruncated,
    };
  }

  /**
   * Write file contents
   */
  async write(
    path: string,
    content: Buffer | string,
    options: WriteOptions = {}
  ): Promise<{ bytesWritten: number; entry?: FileEntry }> {
    const buffer = typeof content === 'string' ? Buffer.from(content) : content;

    const response = await this.client.fileWrite({
      sessionId: this._sessionId,
      path,
      content: buffer,
      overwrite: options.overwrite ?? false,
      createParents: options.createParents ?? false,
    });

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to write file');
    }

    const result = response.result!;
    return {
      bytesWritten: parseInt(result.bytesWritten, 10),
      entry: result.entry ? mapFileEntry(result.entry) : undefined,
    };
  }

  /**
   * Delete file or directory
   */
  async delete(
    path: string,
    options: DeleteOptions = {}
  ): Promise<{ filesDeleted: number; dirsDeleted: number }> {
    const response = await this.client.fileDelete({
      sessionId: this._sessionId,
      path,
      recursive: options.recursive ?? false,
    });

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to delete');
    }

    const result = response.result;
    return {
      filesDeleted: result?.filesDeleted ?? 1,
      dirsDeleted: result?.dirsDeleted ?? 0,
    };
  }

  /**
   * Get file/directory info
   */
  async stat(path: string): Promise<FileEntry> {
    const response = await this.client.fileGetInfo({
      sessionId: this._sessionId,
      path,
    });

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to get file info');
    }

    return mapFileEntry(response.result!.entry!);
  }

  /**
   * Create directory
   */
  async mkdir(path: string, options?: { recursive?: boolean }): Promise<FileEntry> {
    const response = await this.client.fileCreateDirectory({
      sessionId: this._sessionId,
      path,
      createParents: options?.recursive ?? false,
    });

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to create directory');
    }

    // Handle response with or without entry
    if (response.result?.entry) {
      return mapFileEntry(response.result.entry);
    }

    // Fallback: construct minimal entry from path
    const name = path.split('/').filter(Boolean).pop() || path;
    return {
      name,
      path,
      type: 'directory',
      size: 0,
      permissions: '',
      owner: '',
      isHidden: name.startsWith('.'),
      isReadable: true,
      isWritable: true,
      mimeType: 'inode/directory',
    };
  }

  /**
   * Move file or directory
   */
  async move(
    sourcePath: string,
    destinationPath: string,
    options: MoveOptions = {}
  ): Promise<FileEntry> {
    const response = await this.client.fileMove({
      sessionId: this._sessionId,
      sourcePath,
      destinationPath,
      overwrite: options.overwrite ?? false,
    });

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to move');
    }

    return mapFileEntry(response.result!.entry!);
  }

  /**
   * Copy file or directory
   */
  async copy(
    sourcePath: string,
    destinationPath: string,
    options: CopyOptions = {}
  ): Promise<{ entry: FileEntry; bytesCopied: number }> {
    const response = await this.client.fileCopy({
      sessionId: this._sessionId,
      sourcePath,
      destinationPath,
      overwrite: options.overwrite ?? false,
      recursive: options.recursive ?? false,
    });

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to copy');
    }

    const result = response.result!;
    return {
      entry: mapFileEntry(result.entry!),
      bytesCopied: parseInt(result.bytesCopied, 10),
    };
  }

  /**
   * Search for files
   */
  async search(path: string, options: SearchOptions): Promise<FileEntry[]> {
    const response = await this.client.fileSearch({
      sessionId: this._sessionId,
      path,
      filenamePattern: options.pattern,
      contentPattern: '',
      caseSensitive: false,
      includeHidden: options.includeHidden ?? false,
      maxResults: options.maxResults ?? 100,
      maxDepth: options.recursive === false ? 1 : 0,
      contextLines: 0,
    });

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to search');
    }

    return response.result!.matches.filter((m) => m.entry).map((m) => mapFileEntry(m.entry!));
  }

  /**
   * Create archive (zip/tar)
   */
  async archive(
    paths: string[],
    outputPath: string,
    options?: { format?: 'zip' | 'tar' | 'tar.gz'; includeHidden?: boolean }
  ): Promise<FileEntry> {
    const response = await this.client.fileCreateArchive({
      sessionId: this._sessionId,
      sourcePaths: paths,
      destinationPath: outputPath,
      format: options?.format ?? 'zip',
      includeHidden: options?.includeHidden ?? false,
    });

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to create archive');
    }

    return mapFileEntry(response.result!.entry!);
  }
}

/**
 * Map proto StreamFileEntry to SDK FileEntry
 */
function mapFileEntry(entry: StreamFileEntry): FileEntry {
  return {
    name: entry.name,
    path: entry.path,
    type: mapFileType(entry.type),
    size: parseInt(entry.size, 10),
    permissions: entry.permissions,
    owner: entry.owner,
    modifiedAt: entry.modifiedAt ?? undefined,
    isHidden: entry.isHidden,
    isReadable: entry.isReadable,
    isWritable: entry.isWritable,
    mimeType: entry.mimeType,
    symlinkTarget: entry.symlinkTarget || undefined,
  };
}

/**
 * Map proto StreamFileType to string
 */
function mapFileType(type: StreamFileType): 'file' | 'directory' | 'symlink' {
  switch (type) {
    case 2: // STREAM_DIRECTORY
      return 'directory';
    case 3: // STREAM_SYMLINK
      return 'symlink';
    default:
      return 'file';
  }
}
