/**
 * useAgent hook - AI agent execution via WebSocket
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { useSubscription, useRPC } from '../ws/index';

// ============================================================================
// Types
// ============================================================================

export type AgentEventType = 'token' | 'tool_call' | 'tool_result' | 'thinking' | 'error' | 'done';

export interface AgentEvent {
  /**
   * Event type
   */
  type: AgentEventType;
  /**
   * Event payload
   */
  data: unknown;
  /**
   * Timestamp
   */
  timestamp?: string;
}

export interface AgentTokenEvent {
  type: 'token';
  data: {
    text: string;
  };
}

export interface AgentToolCallEvent {
  type: 'tool_call';
  data: {
    id: string;
    name: string;
    input: unknown;
  };
}

export interface AgentToolResultEvent {
  type: 'tool_result';
  data: {
    id: string;
    output: unknown;
    error?: string;
  };
}

export interface AgentDoneEvent {
  type: 'done';
  data: {
    text: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    durationMs: number;
  };
}

export interface AgentErrorEvent {
  type: 'error';
  data: {
    message: string;
    code?: string;
  };
}

export interface UseAgentOptions {
  /**
   * Session ID for agent context
   */
  sessionId: string;
  /**
   * Enable connection
   * @default true
   */
  enabled?: boolean;
  /**
   * Callback for streaming tokens
   */
  onToken?: (text: string) => void;
  /**
   * Callback for tool calls
   */
  onToolCall?: (toolCall: AgentToolCallEvent['data']) => void;
  /**
   * Callback for tool results
   */
  onToolResult?: (result: AgentToolResultEvent['data']) => void;
  /**
   * Callback when agent completes
   */
  onDone?: (result: AgentDoneEvent['data']) => void;
  /**
   * Callback on error
   */
  onError?: (error: Error) => void;
}

export interface UseAgentResult {
  /**
   * Run agent with prompt
   */
  run: (prompt: string, options?: RunAgentOptions) => Promise<string>;
  /**
   * Whether agent is running
   */
  isRunning: boolean;
  /**
   * Streaming text (accumulated tokens)
   */
  streamingText: string;
  /**
   * Final result text
   */
  result: string | null;
  /**
   * Current tool calls in progress
   */
  toolCalls: AgentToolCallEvent['data'][];
  /**
   * Error if any
   */
  error: Error | null;
  /**
   * Reset state
   */
  reset: () => void;
  /**
   * Cancel running agent
   */
  cancel: () => Promise<void>;
}

export interface RunAgentOptions {
  /**
   * Agent mode
   */
  mode?: 'chat' | 'terminal' | 'command' | 'router' | 'planner';
  /**
   * Timeout in seconds
   */
  timeoutSeconds?: number;
  /**
   * JSON schema for structured output
   */
  outputSchema?: string;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for AI agent execution with streaming via WebSocket
 *
 * @example
 * ```tsx
 * function AgentChat({ sessionId }: { sessionId: string }) {
 *   const {
 *     run,
 *     isRunning,
 *     streamingText,
 *     result,
 *   } = useAgent({
 *     sessionId,
 *     onToken: (text) => console.log('Token:', text),
 *     onDone: (result) => console.log('Done:', result),
 *   });
 *
 *   return (
 *     <div>
 *       <pre>{streamingText || result}</pre>
 *       <button onClick={() => run('Hello!')}>Send</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgent(options: UseAgentOptions): UseAgentResult {
  const { sessionId, enabled = true, onToken, onToolCall, onToolResult, onDone, onError } = options;

  const [isRunning, setIsRunning] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [toolCalls, setToolCalls] = useState<AgentToolCallEvent['data'][]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  // Refs for callbacks
  const onTokenRef = useRef(onToken);
  const onToolCallRef = useRef(onToolCall);
  const onToolResultRef = useRef(onToolResult);
  const onDoneRef = useRef(onDone);
  const onErrorRef = useRef(onError);
  onTokenRef.current = onToken;
  onToolCallRef.current = onToolCall;
  onToolResultRef.current = onToolResult;
  onDoneRef.current = onDone;
  onErrorRef.current = onError;

  // RPC for starting agent
  const { call } = useRPC({
    onError: (err) => {
      setError(err);
      setIsRunning(false);
      onErrorRef.current?.(err);
    },
  });

  // Subscribe to agent events
  useSubscription<AgentEvent>({
    channel: requestId ? `agent#${requestId}#events` : '',
    enabled: enabled && !!requestId && isRunning,
    onData: (event) => {
      switch (event.type) {
        case 'token': {
          const tokenData = event.data as AgentTokenEvent['data'];
          setStreamingText((prev) => prev + tokenData.text);
          onTokenRef.current?.(tokenData.text);
          break;
        }
        case 'tool_call': {
          const toolCallData = event.data as AgentToolCallEvent['data'];
          setToolCalls((prev) => [...prev, toolCallData]);
          onToolCallRef.current?.(toolCallData);
          break;
        }
        case 'tool_result': {
          const toolResultData = event.data as AgentToolResultEvent['data'];
          setToolCalls((prev) => prev.filter((tc) => tc.id !== toolResultData.id));
          onToolResultRef.current?.(toolResultData);
          break;
        }
        case 'done': {
          const doneData = event.data as AgentDoneEvent['data'];
          setResult(doneData.text);
          setIsRunning(false);
          setRequestId(null);
          onDoneRef.current?.(doneData);
          break;
        }
        case 'error': {
          const errorData = event.data as AgentErrorEvent['data'];
          const err = new Error(errorData.message);
          setError(err);
          setIsRunning(false);
          setRequestId(null);
          onErrorRef.current?.(err);
          break;
        }
      }
    },
    onError: (err) => {
      setError(err);
      setIsRunning(false);
      onErrorRef.current?.(err);
    },
  });

  // Run agent
  const run = useCallback(
    async (prompt: string, runOptions?: RunAgentOptions): Promise<string> => {
      if (!sessionId) {
        throw new Error('Session ID required');
      }

      // Reset state
      setStreamingText('');
      setResult(null);
      setToolCalls([]);
      setError(null);
      setIsRunning(true);

      try {
        // Start agent via RPC
        const response = await call<
          {
            session_id: string;
            prompt: string;
            mode?: string;
            timeout_seconds?: number;
            output_schema?: string;
          },
          { request_id: string; text?: string }
        >('agent.run', {
          session_id: sessionId,
          prompt,
          mode: runOptions?.mode,
          timeout_seconds: runOptions?.timeoutSeconds,
          output_schema: runOptions?.outputSchema,
        });

        setRequestId(response.request_id);

        // If immediate response (non-streaming), return it
        if (response.text) {
          setResult(response.text);
          setIsRunning(false);
          return response.text;
        }

        // For streaming, wait for done event
        return new Promise((resolve, reject) => {
          const checkDone = setInterval(() => {
            if (result) {
              clearInterval(checkDone);
              resolve(result);
            }
            if (error) {
              clearInterval(checkDone);
              reject(error);
            }
          }, 100);

          // Timeout after 5 minutes
          setTimeout(() => {
            clearInterval(checkDone);
            if (!result && !error) {
              const timeoutError = new Error('Agent timeout');
              setError(timeoutError);
              setIsRunning(false);
              reject(timeoutError);
            }
          }, 300000);
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsRunning(false);
        throw error;
      }
    },
    [call, sessionId, result, error]
  );

  // Cancel agent
  const cancel = useCallback(async (): Promise<void> => {
    if (!requestId) return;

    try {
      await call('agent.cancel', { request_id: requestId });
    } finally {
      setIsRunning(false);
      setRequestId(null);
    }
  }, [call, requestId]);

  // Reset state
  const reset = useCallback(() => {
    setStreamingText('');
    setResult(null);
    setToolCalls([]);
    setError(null);
    setIsRunning(false);
    setRequestId(null);
  }, []);

  return {
    run,
    isRunning,
    streamingText,
    result,
    toolCalls,
    error,
    reset,
    cancel,
  };
}
