/**
 * @cmdop/react
 * React hooks and components for CMDOP agent interaction
 */

'use client';

// ============================================================================
// Core Re-exports
// ============================================================================

export {
  // Types
  type TransportMode,
  type SessionState,
  type SessionInfo,
  type FileInfo,
  type CMDOPConfig,
  DEFAULT_CONFIG,
  VERSION,
  // Errors
  CMDOPError,
  ConnectionError,
  AuthenticationError,
  SessionError,
  TimeoutError,
  NotFoundError,
  PermissionError,
  ResourceExhaustedError,
  CancelledError,
  UnavailableError,
  // API clients
  api,
  machines,
  workspaces,
  system,
  API_BASE_URL,
  // Modules
  MachinesModule,
  WorkspacesModule,
  SystemModule,
} from '@cmdop/core';

// ============================================================================
// WebSocket
// ============================================================================

export {
  // Client
  CMDOPWebSocketClient,
  type CMDOPWebSocketConfig,
  type ConnectionState,
  // Provider
  WebSocketProvider,
  useWebSocket,
  type WebSocketProviderProps,
  // Hooks
  useSubscription,
  useRPC,
  type UseSubscriptionOptions,
  type UseSubscriptionResult,
  type UseRPCOptions,
  type UseRPCResult,
  // Auto-generated typed API client
  APIClient,
  API_VERSION,
  GENERATED_AT,
} from './ws/index';

// Re-export all generated types from ws/generated
export * from './ws/generated/types';

// ============================================================================
// Real-time Hooks (Terminal, Agent, Files, Sessions)
// ============================================================================

export {
  // Terminal
  useTerminal,
  type UseTerminalOptions,
  type UseTerminalResult,
  type TerminalOutput,
  type TerminalStatus,
  // Agent
  useAgent,
  type UseAgentOptions,
  type UseAgentResult,
  type RunAgentOptions,
  type AgentEvent,
  type AgentEventType,
  type AgentTokenEvent,
  type AgentToolCallEvent,
  type AgentToolResultEvent,
  type AgentDoneEvent,
  type AgentErrorEvent,
  // Files
  useFiles,
  type UseFilesOptions,
  type UseFilesResult,
  type ListOptions,
  type ReadOptions,
  type WriteOptions,
  type SearchOptions,
  // Sessions
  useSessions,
  type UseSessionsOptions,
  type UseSessionsResult,
  type CreateSessionOptions,
} from './hooks/index';

// ============================================================================
// Utilities
// ============================================================================

export {
  // Base64
  encodeBase64,
  decodeBase64,
  tryDecodeBase64,
  encodeBase64Bytes,
  decodeBase64Bytes,
  // Errors
  mapRPCError,
  createErrorFromResult,
  isRetryableError,
  // Class names
  cn,
} from './utils/index';

// ============================================================================
// Chat Components
// ============================================================================

export {
  // Components
  ChatInput,
  ChatMessages,
  MessageBubble,
  TypingIndicator,
  CommandOutput,
  MachineChat,
  // Hooks
  useMessageOperations,
  useMachineChat,
  // Types
  type BaseMessage,
  type ChatInputProps,
  type ChatMessagesProps,
  type MessageBubbleProps,
  type TypingIndicatorProps,
  type CommandOutputProps,
  type MachineChatProps,
  type UseMessageOperationsResult,
  type UseMachineChatOptions,
  type UseMachineChatResult,
  type MachineMessage,
  type CommandExecution,
  type MachineCentrifugoMessage,
} from './components/index';

// ============================================================================
// HTTP API Context & Provider
// ============================================================================

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useState, useCallback } from 'react';
import { machines, workspaces, type CMDOPConfig } from '@cmdop/core';

interface CMDOPContextValue {
  config: CMDOPConfig;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
}

const CMDOPContext = createContext<CMDOPContextValue | null>(null);

export interface CMDOPProviderProps {
  children: ReactNode;
  apiKey?: string;
  token?: string;
}

/**
 * Provider for HTTP API authentication
 */
export function CMDOPProvider({ children, apiKey, token }: CMDOPProviderProps) {
  const [currentToken, setCurrentToken] = useState<string | undefined>(token);

  const setToken = useCallback((newToken: string) => {
    setCurrentToken(newToken);
    machines.setToken(newToken);
    workspaces.setToken(newToken);
  }, []);

  useMemo(() => {
    if (currentToken) {
      machines.setToken(currentToken);
      workspaces.setToken(currentToken);
    }
  }, [currentToken]);

  const value: CMDOPContextValue = useMemo(
    () => ({
      config: { apiKey },
      isAuthenticated: !!currentToken,
      setToken,
    }),
    [apiKey, currentToken, setToken]
  );

  return <CMDOPContext.Provider value={value}>{children}</CMDOPContext.Provider>;
}

/**
 * Hook to access HTTP API context
 */
export function useCMDOP(): CMDOPContextValue {
  const context = useContext(CMDOPContext);
  if (!context) {
    throw new Error('useCMDOP must be used within a CMDOPProvider');
  }
  return context;
}

// ============================================================================
// SWR Hooks for HTTP API
// ============================================================================

import useSWR, { type SWRConfiguration } from 'swr';

/**
 * Machine type from API
 */
export interface Machine {
  id: string;
  name: string;
  hostname?: string;
  status?: string;
  workspace?: string;
  [key: string]: unknown;
}

/**
 * Workspace type from API
 */
export interface Workspace {
  id: string;
  name: string;
  [key: string]: unknown;
}

/**
 * Hook for fetching machines list
 */
export interface UseMachinesOptions extends SWRConfiguration {
  page?: number;
  pageSize?: number;
}

export interface UseMachinesResult {
  machines: Machine[];
  total: number;
  isLoading: boolean;
  isValidating: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export function useMachines(options: UseMachinesOptions = {}): UseMachinesResult {
  const { page, pageSize, ...swrConfig } = options;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ['machines', page, pageSize],
    async () => {
      const response = await machines.machines_machines.machinesList({
        page,
        page_size: pageSize,
      });
      return response;
    },
    {
      revalidateOnFocus: false,
      ...swrConfig,
    }
  );

  return {
    machines: (data?.results ?? []) as unknown as Machine[],
    total: data?.count ?? 0,
    isLoading,
    isValidating,
    error,
    refetch: () => mutate(),
  };
}

/**
 * Hook for fetching single machine
 */
export interface UseMachineResult {
  machine: Machine | null;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export function useMachine(
  machineId: string | undefined,
  options: SWRConfiguration = {}
): UseMachineResult {
  const { data, error, isLoading, mutate } = useSWR(
    machineId ? ['machine', machineId] : null,
    async () => {
      if (!machineId) return null;
      return machines.machines_machines.machinesRetrieve(machineId);
    },
    {
      revalidateOnFocus: false,
      ...options,
    }
  );

  return {
    machine: (data ?? null) as unknown as Machine | null,
    isLoading,
    error,
    refetch: () => mutate(),
  };
}

/**
 * Hook for fetching workspaces list
 */
export interface UseWorkspacesResult {
  workspaces: Workspace[];
  total: number;
  isLoading: boolean;
  isValidating: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export function useWorkspaces(options: SWRConfiguration = {}): UseWorkspacesResult {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    'workspaces',
    async () => {
      return workspaces.workspaces_workspaces.workspacesList();
    },
    {
      revalidateOnFocus: false,
      ...options,
    }
  );

  return {
    workspaces: (data?.results ?? []) as unknown as Workspace[],
    total: data?.count ?? 0,
    isLoading,
    isValidating,
    error,
    refetch: () => mutate(),
  };
}

/**
 * Hook for fetching single workspace
 */
export interface UseWorkspaceResult {
  workspace: Workspace | null;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export function useWorkspace(
  workspaceId: string | undefined,
  options: SWRConfiguration = {}
): UseWorkspaceResult {
  const { data, error, isLoading, mutate } = useSWR(
    workspaceId ? ['workspace', workspaceId] : null,
    async () => {
      if (!workspaceId) return null;
      return workspaces.workspaces_workspaces.workspacesRetrieve(workspaceId);
    },
    {
      revalidateOnFocus: false,
      ...options,
    }
  );

  return {
    workspace: (data ?? null) as unknown as Workspace | null,
    isLoading,
    error,
    refetch: () => mutate(),
  };
}
