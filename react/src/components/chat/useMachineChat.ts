/**
 * Machine Chat Hook
 *
 * Manages chat state for single machine context.
 * Uses external Centrifugo client for RPC and receives subscription data as prop.
 *
 * @example
 * ```tsx
 * // In apps/web with @djangocfg/centrifugo
 * const { client } = useCentrifugo();
 * const { data } = useSubscription({ channel: `ai_chat:workspace:${workspaceId}` });
 *
 * const chat = useMachineChat({
 *   workspaceId,
 *   machineId,
 *   centrifugoClient: client,
 *   subscriptionData: data,
 * });
 * ```
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useMessageOperations } from './useMessageOperations';
import type {
  MachineMessage,
  MachineCentrifugoMessage,
  CommandExecution,
  UseMachineChatOptions,
  UseMachineChatResult,
} from './types';

export function useMachineChat({
  workspaceId,
  machineId,
  centrifugoClient,
  subscriptionData,
}: UseMachineChatOptions): UseMachineChatResult {
  // State
  const [isExecuting, setIsExecuting] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);

  // Refs for internal tracking (don't need to trigger re-renders)
  // Map client_message_id -> real_message_id for concurrent message support
  const messageIdMapRef = useRef<Map<string, string>>(new Map());
  const activeMessageIdsRef = useRef<Set<string>>(new Set());

  // Client from @djangocfg/centrifugo
  const client = centrifugoClient ?? null;
  const isConnected = !!client;

  // Message operations
  const {
    messages,
    setMessages,
    addMessage,
    updateMessage,
    appendContent,
    clearMessages: clearMessagesBase,
  } = useMessageOperations<MachineMessage>();

  // Update execution within a message
  const updateExecution = useCallback(
    (messageId: string, executionId: string, updates: Partial<CommandExecution>) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId || !msg.executions) return msg;
          return {
            ...msg,
            executions: msg.executions.map((exec) =>
              exec.id === executionId ? { ...exec, ...updates } : exec
            ),
          };
        })
      );
    },
    [setMessages]
  );

  // Append output to execution
  const appendExecutionOutput = useCallback(
    (messageId: string, executionId: string, chunk: string) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId || !msg.executions) return msg;
          return {
            ...msg,
            executions: msg.executions.map((exec) =>
              exec.id === executionId
                ? { ...exec, output: (exec.output || '') + chunk }
                : exec
            ),
          };
        })
      );
    },
    [setMessages]
  );

  // Helper to find the correct message ID (handles both client and server IDs)
  const resolveMessageId = useCallback(
    (serverMessageId: string, clientMessageId?: string): string => {
      // If we have a client_message_id, check the map for the local ID
      if (clientMessageId && activeMessageIdsRef.current.has(clientMessageId)) {
        return clientMessageId;
      }
      // Check if this server ID is mapped from a client ID
      for (const [clientId, serverId] of messageIdMapRef.current.entries()) {
        if (serverId === serverMessageId) {
          return clientId;
        }
      }
      // Fallback to server message ID
      return serverMessageId;
    },
    []
  );

  // Handle Centrifugo messages
  const handleCentrifugoMessage = useCallback(
    (message: MachineCentrifugoMessage) => {
      switch (message.type) {
        case 'message_start': {
          // Map client_message_id to server message_id
          if (message.client_message_id && message.message_id) {
            messageIdMapRef.current.set(message.client_message_id, message.message_id);
            // Update the message but keep using client ID as key
            updateMessage(message.client_message_id, {
              content: '',
              isStreaming: true,
            });
          }
          break;
        }

        case 'message_chunk': {
          // Always use message_id from server, resolve to local ID if needed
          const targetId = resolveMessageId(message.message_id, message.client_message_id);
          appendContent(targetId, message.chunk);
          break;
        }

        case 'message_complete': {
          // Always use message_id from server, resolve to local ID if needed
          const targetId = resolveMessageId(message.message_id, message.client_message_id);
          updateMessage(targetId, {
            content: message.content,
            isStreaming: false,
          });
          // Remove from active set
          activeMessageIdsRef.current.delete(targetId);
          if (activeMessageIdsRef.current.size === 0) {
            setIsStreaming(false);
            setIsExecuting(false);
          }
          break;
        }

        case 'error': {
          const targetId = resolveMessageId(message.message_id, message.client_message_id);
          updateMessage(targetId, {
            content: `Error: ${message.error}`,
            isStreaming: false,
          });
          setError(message.error);
          // Remove from active set
          activeMessageIdsRef.current.delete(targetId);
          if (activeMessageIdsRef.current.size === 0) {
            setIsStreaming(false);
            setIsExecuting(false);
          }
          break;
        }

        case 'command_generated': {
          const targetId = resolveMessageId(message.message_id, message.client_message_id);
          updateMessage(targetId, {
            executions: message.executions,
          });
          break;
        }

        case 'execution_started': {
          const targetId = resolveMessageId(message.message_id, message.client_message_id);
          updateExecution(targetId, message.execution_id, {
            status: 'running',
            command: message.command,
            startedAt: new Date(),
          });
          break;
        }

        case 'output_chunk': {
          const targetId = resolveMessageId(message.message_id, message.client_message_id);
          appendExecutionOutput(targetId, message.execution_id, message.chunk);
          break;
        }

        case 'execution_completed': {
          const targetId = resolveMessageId(message.message_id, message.client_message_id);
          updateExecution(targetId, message.execution_id, {
            status: message.exit_code === 0 ? 'completed' : 'error',
            exitCode: message.exit_code,
            completedAt: new Date(),
          });
          break;
        }
      }
    },
    [
      resolveMessageId,
      updateMessage,
      appendContent,
      updateExecution,
      appendExecutionOutput,
    ]
  );

  // Process subscription data from external useSubscription hook
  // Usage: const { data } = useSubscription({ channel: `ai_chat:workspace:${workspaceId}` });
  // Then pass data as subscriptionData prop
  useEffect(() => {
    if (subscriptionData) {
      handleCentrifugoMessage(subscriptionData);
    }
  }, [subscriptionData, handleCentrifugoMessage]);

  // Load history
  const loadHistory = useCallback(async () => {
    if (!client || !isConnected || !workspaceId) return;

    setIsLoadingHistory(true);
    setError(null);

    try {
      const result = await client.namedRPC<{
        success: boolean;
        error?: string;
        messages?: Array<{ id: string; role: string; content: string; created_at: string }>;
        has_more?: boolean;
      }>('ai_chat.get_history', {
        workspace_id: workspaceId,
        limit: 50,
        offset: 0,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to load history');
      }

      const loadedMessages: MachineMessage[] = (result.messages ?? []).map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }));

      setMessages(loadedMessages);
      setHasMoreHistory(result.has_more ?? false);
    } catch (err) {
      // Silent fail - don't show error for history loading
      console.error('[MachineChat] Failed to load history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [client, isConnected, workspaceId, setMessages]);

  // Load on mount/change
  useEffect(() => {
    if (!workspaceId) {
      setMessages([]);
      return;
    }
    loadHistory();
  }, [workspaceId, loadHistory, setMessages]);

  // Send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !client || !isConnected || !workspaceId) {
        return;
      }

      setIsExecuting(true);
      setError(null);

      // User message
      const userMessage: MachineMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date(),
      };
      addMessage(userMessage);

      // Assistant message (optimistic)
      const assistantMessage: MachineMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      addMessage(assistantMessage);
      // Track this message as active
      activeMessageIdsRef.current.add(assistantMessage.id);
      setIsStreaming(true);

      try {
        const result = await client.namedRPC<{
          success: boolean;
          error?: string;
          message_id?: string;
        }>('ai_chat.send_message', {
          workspace_id: workspaceId,
          message: content,
          target_machine_ids: [machineId],
          client_message_id: assistantMessage.id,
          stream: true,
        }, { timeout: 60000 });

        if (!result.success) {
          throw new Error(result.error || 'Failed to send message');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send';

        updateMessage(assistantMessage.id, {
          content: `Error: ${errorMessage}`,
          isStreaming: false,
        });

        // Remove from active set
        activeMessageIdsRef.current.delete(assistantMessage.id);
        if (activeMessageIdsRef.current.size === 0) {
          setIsStreaming(false);
          setIsExecuting(false);
        }
        setError(errorMessage);
      }
    },
    [client, isConnected, workspaceId, machineId, addMessage, updateMessage]
  );

  // Load more (pagination)
  const loadMoreMessages = useCallback(() => {
    // TODO: Implement pagination
    console.info('[MachineChat] Load more - not implemented');
  }, []);

  // Clear
  const clearMessages = useCallback(() => {
    clearMessagesBase();
    setIsStreaming(false);
    setIsExecuting(false);
    activeMessageIdsRef.current.clear();
    messageIdMapRef.current.clear();
    setError(null);
  }, [clearMessagesBase]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoadingHistory,
    hasMoreHistory,
    isExecuting,
    isStreaming,
    error,
    sendMessage,
    loadMoreMessages,
    clearMessages,
    clearError,
  };
}
