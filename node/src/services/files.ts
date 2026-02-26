/**
 * Files service for file operations on remote agent
 *
 * For local IPC, sessionId is not required (server ignores it).
 * For remote connections, use setSessionId() to set the active session.
 */

import { CMDOPError } from '@cmdop/core';
import type { StreamFileEntry, StreamFileType } from '../proto/generated/file_operations/common';
import { BaseService } from './base';
import type {
  FileEntry,
  ListOptions,
  ListResult,
  ReadOptions,
  ReadResult,
  WriteOptions,
  DeleteOptions,
  CopyOptions,
  MoveOptions,
  SearchOptions,
} from '../models/files';

export type {
  FileEntry,
  ListOptions,
  ListResult,
  ReadOptions,
  ReadResult,
  WriteOptions,
  DeleteOptions,
  CopyOptions,
  MoveOptions,
  SearchOptions,
} from '../models/files';

export class FilesService extends BaseService {
  async list(path: string, options: ListOptions = {}): Promise<ListResult> {
    const response = await this.call(() =>
      this.client.fileListDirectory({
        sessionId: this._sessionId,
        path,
        includeHidden: options.includeHidden ?? false,
        pageSize: options.pageSize ?? 100,
        pageToken: options.pageToken ?? '',
      })
    );

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

  async read(path: string, options: ReadOptions = {}): Promise<ReadResult> {
    const response = await this.call(() =>
      this.client.fileRead({
        sessionId: this._sessionId,
        path,
        offset: String(options.offset ?? 0),
        length: String(options.length ?? 0),
        transcode: false,
      })
    );

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

  async write(
    path: string,
    content: Buffer | string,
    options: WriteOptions = {}
  ): Promise<{ bytesWritten: number; entry?: FileEntry }> {
    const buffer = typeof content === 'string' ? Buffer.from(content) : content;

    const response = await this.call(() =>
      this.client.fileWrite({
        sessionId: this._sessionId,
        path,
        content: buffer,
        overwrite: options.overwrite ?? false,
        createParents: options.createParents ?? false,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to write file');
    }

    const result = response.result!;
    return {
      bytesWritten: parseInt(result.bytesWritten, 10),
      entry: result.entry ? mapFileEntry(result.entry) : undefined,
    };
  }

  async delete(
    path: string,
    options: DeleteOptions = {}
  ): Promise<{ filesDeleted: number; dirsDeleted: number }> {
    const response = await this.call(() =>
      this.client.fileDelete({
        sessionId: this._sessionId,
        path,
        recursive: options.recursive ?? false,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to delete');
    }

    const result = response.result;
    return {
      filesDeleted: result?.filesDeleted ?? 1,
      dirsDeleted: result?.dirsDeleted ?? 0,
    };
  }

  async stat(path: string): Promise<FileEntry> {
    const response = await this.call(() =>
      this.client.fileGetInfo({ sessionId: this._sessionId, path })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to get file info');
    }

    return mapFileEntry(response.result!.entry!);
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<FileEntry> {
    const response = await this.call(() =>
      this.client.fileCreateDirectory({
        sessionId: this._sessionId,
        path,
        createParents: options?.recursive ?? false,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to create directory');
    }

    if (response.result?.entry) {
      return mapFileEntry(response.result.entry);
    }

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

  async move(
    sourcePath: string,
    destinationPath: string,
    options: MoveOptions = {}
  ): Promise<FileEntry> {
    const response = await this.call(() =>
      this.client.fileMove({
        sessionId: this._sessionId,
        sourcePath,
        destinationPath,
        overwrite: options.overwrite ?? false,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to move');
    }

    return mapFileEntry(response.result!.entry!);
  }

  async copy(
    sourcePath: string,
    destinationPath: string,
    options: CopyOptions = {}
  ): Promise<{ entry: FileEntry; bytesCopied: number }> {
    const response = await this.call(() =>
      this.client.fileCopy({
        sessionId: this._sessionId,
        sourcePath,
        destinationPath,
        overwrite: options.overwrite ?? false,
        recursive: options.recursive ?? false,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to copy');
    }

    const result = response.result!;
    return {
      entry: mapFileEntry(result.entry!),
      bytesCopied: parseInt(result.bytesCopied, 10),
    };
  }

  async search(path: string, options: SearchOptions): Promise<FileEntry[]> {
    const response = await this.call(() =>
      this.client.fileSearch({
        sessionId: this._sessionId,
        path,
        filenamePattern: options.pattern,
        contentPattern: '',
        caseSensitive: false,
        includeHidden: options.includeHidden ?? false,
        maxResults: options.maxResults ?? 100,
        maxDepth: options.recursive === false ? 1 : 0,
        contextLines: 0,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to search');
    }

    return response.result!.matches.filter((m) => m.entry).map((m) => mapFileEntry(m.entry!));
  }

  async archive(
    paths: string[],
    outputPath: string,
    options?: { format?: 'zip' | 'tar' | 'tar.gz'; includeHidden?: boolean }
  ): Promise<FileEntry> {
    const response = await this.call(() =>
      this.client.fileCreateArchive({
        sessionId: this._sessionId,
        sourcePaths: paths,
        destinationPath: outputPath,
        format: options?.format ?? 'zip',
        includeHidden: options?.includeHidden ?? false,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Failed to create archive');
    }

    return mapFileEntry(response.result!.entry!);
  }
}

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

function mapFileType(type: StreamFileType): 'file' | 'directory' | 'symlink' {
  switch (type) {
    case 2:
      return 'directory';
    case 3:
      return 'symlink';
    default:
      return 'file';
  }
}
