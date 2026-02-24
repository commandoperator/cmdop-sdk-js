/**
 * useSessions hook - Terminal session management via WebSocket RPC
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useWebSocket } from '../ws/index';
import { APIClient } from '../ws/generated/index';
import type {
  WsSessionResult,
  WsSessionListResult,
} from '../ws/generated/types';

// ============================================================================
// Types
// ============================================================================

export interface UseSessionsOptions {
  /**
   * Auto-fetch sessions on mount
   * @default true
   */
  autoFetch?: boolean;
  /**
   * Max sessions to fetch
   */
  limit?: number;
}

export interface UseSessionsResult {
  /**
   * List of sessions
   */
  sessions: WsSessionResult[];
  /**
   * Total session count
   */
  total: number;
  /**
   * Refresh sessions list
   */
  refresh: () => Promise<void>;
  /**
   * Create a new session
   */
  create: (options?: CreateSessionOptions) => Promise<WsSessionResult>;
  /**
   * Get session by ID
   */
  get: (sessionId: string) => Promise<WsSessionResult>;
  /**
   * Close a session
   */
  close: (sessionId: string) => Promise<void>;
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

export interface CreateSessionOptions {
  name?: string;
  shell?: string;
  workingDirectory?: string;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSessions(options: UseSessionsOptions = {}): UseSessionsResult {
  const { autoFetch = true, limit } = options;
  const { client, isConnected } = useWebSocket();
  const [sessions, setSessions] = useState<WsSessionResult[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Create APIClient instance
  const apiClient = useMemo(() => {
    if (!client) return null;
    return new APIClient(client);
  }, [client]);

  const clearError = useCallback(() => setError(null), []);

  const refresh = useCallback(async (): Promise<void> => {
    if (!apiClient || !isConnected) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiClient.terminalListSessions({ limit });
      setSessions(result.sessions);
      setTotal(result.total);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, isConnected, limit]);

  const create = useCallback(
    async (opts?: CreateSessionOptions): Promise<WsSessionResult> => {
      if (!apiClient || !isConnected) {
        throw new Error('WebSocket not connected');
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await apiClient.terminalCreateSession({
          name: opts?.name,
          shell: opts?.shell,
          working_directory: opts?.workingDirectory,
        });

        // Add to local state
        setSessions((prev) => [...prev, result]);
        setTotal((prev) => prev + 1);

        return result;
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

  const get = useCallback(
    async (sessionId: string): Promise<WsSessionResult> => {
      if (!apiClient || !isConnected) {
        throw new Error('WebSocket not connected');
      }

      setIsLoading(true);
      setError(null);

      try {
        return await apiClient.terminalGetSession({ session_id: sessionId });
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

  const close = useCallback(
    async (sessionId: string): Promise<void> => {
      if (!apiClient || !isConnected) {
        throw new Error('WebSocket not connected');
      }

      setIsLoading(true);
      setError(null);

      try {
        await apiClient.terminalClose({ session_id: sessionId });

        // Remove from local state
        setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
        setTotal((prev) => Math.max(0, prev - 1));
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

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && isConnected && apiClient) {
      refresh();
    }
  }, [autoFetch, isConnected, apiClient, refresh]);

  return {
    sessions,
    total,
    refresh,
    create,
    get,
    close,
    isLoading,
    error,
    clearError,
  };
}
