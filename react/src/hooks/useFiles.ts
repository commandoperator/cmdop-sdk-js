/**
 * useFiles hook - File operations via WebSocket RPC
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useWebSocket } from '../ws/index';
import { APIClient } from '../ws/generated/index';
import { encodeBase64 } from '../utils/base64';
import type {
  WsListDirectoryParams,
  WsListDirectoryResult,
  WsReadFileParams,
  WsReadFileResult,
  WsWriteFileParams,
  WsWriteFileResult,
  WsDeleteParams,
  WsDeleteResult,
  WsMoveParams,
  WsMoveResult,
  WsCreateDirectoryParams,
  WsCreateDirectoryResult,
  WsSearchParams,
  WsSearchResult,
  WsGetFileInfoParams,
  WsGetFileInfoResult,
  WsFileEntry,
} from '../ws/generated/types';

// ============================================================================
// Types
// ============================================================================

export interface UseFilesOptions {
  /**
   * Session ID for file operations
   */
  sessionId: string;
}

export interface UseFilesResult {
  /**
   * List directory contents
   */
  list: (path: string, options?: ListOptions) => Promise<WsListDirectoryResult>;
  /**
   * Read file contents
   */
  read: (path: string, options?: ReadOptions) => Promise<WsReadFileResult>;
  /**
   * Write file contents
   */
  write: (path: string, content: string, options?: WriteOptions) => Promise<WsWriteFileResult>;
  /**
   * Delete file or directory
   */
  remove: (path: string, recursive?: boolean) => Promise<WsDeleteResult>;
  /**
   * Move or rename file/directory
   */
  move: (sourcePath: string, destPath: string) => Promise<WsMoveResult>;
  /**
   * Create directory
   */
  mkdir: (path: string, createParents?: boolean) => Promise<WsCreateDirectoryResult>;
  /**
   * Search files
   */
  search: (path: string, options: SearchOptions) => Promise<WsSearchResult>;
  /**
   * Get file/directory info
   */
  getInfo: (path: string) => Promise<WsGetFileInfoResult>;
  /**
   * Loading state
   */
  isLoading: boolean;
  /**
   * Last error
   */
  error: Error | null;
  /**
   * Clear error
   */
  clearError: () => void;
}

export interface ListOptions {
  pageSize?: number;
  pageToken?: string;
  includeHidden?: boolean;
  sortOrder?: string;
}

export interface ReadOptions {
  offset?: number;
  length?: number;
}

export interface WriteOptions {
  overwrite?: boolean;
  createParents?: boolean;
}

export interface SearchOptions {
  filenamePattern?: string;
  contentPattern?: string;
  caseSensitive?: boolean;
  maxResults?: number;
  maxDepth?: number;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useFiles({ sessionId }: UseFilesOptions): UseFilesResult {
  const { client, isConnected } = useWebSocket();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Create APIClient instance
  const apiClient = useMemo(() => {
    if (!client) return null;
    return new APIClient(client);
  }, [client]);

  const clearError = useCallback(() => setError(null), []);

  // Helper for wrapping operations
  const wrapOperation = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      if (!apiClient || !isConnected) {
        throw new Error('WebSocket not connected');
      }
      setIsLoading(true);
      setError(null);
      try {
        return await operation();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [apiClient, isConnected]
  );

  const list = useCallback(
    async (path: string, options?: ListOptions): Promise<WsListDirectoryResult> => {
      return wrapOperation(() =>
        apiClient!.fileListDirectory({
          session_id: sessionId,
          path,
          page_size: options?.pageSize,
          page_token: options?.pageToken,
          include_hidden: options?.includeHidden,
          sort_order: options?.sortOrder,
        })
      );
    },
    [apiClient, sessionId, wrapOperation]
  );

  const read = useCallback(
    async (path: string, options?: ReadOptions): Promise<WsReadFileResult> => {
      return wrapOperation(() =>
        apiClient!.fileRead({
          session_id: sessionId,
          path,
          offset: options?.offset,
          length: options?.length,
        })
      );
    },
    [apiClient, sessionId, wrapOperation]
  );

  const write = useCallback(
    async (path: string, content: string, options?: WriteOptions): Promise<WsWriteFileResult> => {
      // Content should be base64 encoded
      const base64Content = encodeBase64(content);

      return wrapOperation(() =>
        apiClient!.fileWrite({
          session_id: sessionId,
          path,
          content: base64Content,
          overwrite: options?.overwrite,
          create_parents: options?.createParents,
        })
      );
    },
    [apiClient, sessionId, wrapOperation]
  );

  const remove = useCallback(
    async (path: string, recursive = false): Promise<WsDeleteResult> => {
      return wrapOperation(() =>
        apiClient!.fileDelete({
          session_id: sessionId,
          path,
          recursive,
        })
      );
    },
    [apiClient, sessionId, wrapOperation]
  );

  const move = useCallback(
    async (sourcePath: string, destPath: string): Promise<WsMoveResult> => {
      return wrapOperation(() =>
        apiClient!.fileMove({
          session_id: sessionId,
          source_path: sourcePath,
          destination_path: destPath,
        })
      );
    },
    [apiClient, sessionId, wrapOperation]
  );

  const mkdir = useCallback(
    async (path: string, createParents = true): Promise<WsCreateDirectoryResult> => {
      return wrapOperation(() =>
        apiClient!.fileCreateDirectory({
          session_id: sessionId,
          path,
          create_parents: createParents,
        })
      );
    },
    [apiClient, sessionId, wrapOperation]
  );

  const search = useCallback(
    async (path: string, options: SearchOptions): Promise<WsSearchResult> => {
      return wrapOperation(() =>
        apiClient!.fileSearch({
          session_id: sessionId,
          path,
          filename_pattern: options.filenamePattern,
          content_pattern: options.contentPattern,
          case_sensitive: options.caseSensitive,
          max_results: options.maxResults,
          max_depth: options.maxDepth,
        })
      );
    },
    [apiClient, sessionId, wrapOperation]
  );

  const getInfo = useCallback(
    async (path: string): Promise<WsGetFileInfoResult> => {
      return wrapOperation(() =>
        apiClient!.fileGetInfo({
          session_id: sessionId,
          path,
        })
      );
    },
    [apiClient, sessionId, wrapOperation]
  );

  return {
    list,
    read,
    write,
    remove,
    move,
    mkdir,
    search,
    getInfo,
    isLoading,
    error,
    clearError,
  };
}
