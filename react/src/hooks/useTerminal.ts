/**
 * useTerminal hook - Real-time terminal connection via WebSocket
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSubscription, useRPC } from '../ws/index';

// ============================================================================
// Types
// ============================================================================

export interface TerminalOutput {
  /**
   * Output data (may be base64 encoded)
   */
  data: string;
  /**
   * Timestamp
   */
  timestamp?: string;
}

export interface TerminalStatus {
  /**
   * Session state
   */
  state: 'active' | 'closed' | 'error';
  /**
   * Exit code if closed
   */
  exitCode?: number;
}

export interface UseTerminalOptions {
  /**
   * Session ID to connect to
   */
  sessionId: string;
  /**
   * Enable connection
   * @default true
   */
  enabled?: boolean;
  /**
   * Callback when output is received
   */
  onOutput?: (data: string) => void;
  /**
   * Callback when status changes
   */
  onStatus?: (status: TerminalStatus) => void;
  /**
   * Callback on error
   */
  onError?: (error: Error) => void;
}

export interface UseTerminalResult {
  /**
   * Whether connected to terminal
   */
  isConnected: boolean;
  /**
   * Whether connecting
   */
  isConnecting: boolean;
  /**
   * Connection/operation error
   */
  error: Error | null;
  /**
   * Accumulated output
   */
  output: string;
  /**
   * Current terminal status
   */
  status: TerminalStatus | null;
  /**
   * Send input to terminal
   */
  sendInput: (data: string) => Promise<void>;
  /**
   * Resize terminal
   */
  resize: (cols: number, rows: number) => Promise<void>;
  /**
   * Send signal (e.g., SIGINT)
   */
  signal: (sig: number | string) => Promise<void>;
  /**
   * Clear accumulated output
   */
  clear: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for real-time terminal interaction via WebSocket
 *
 * @example
 * ```tsx
 * function Terminal({ sessionId }: { sessionId: string }) {
 *   const {
 *     isConnected,
 *     output,
 *     sendInput,
 *     resize,
 *   } = useTerminal({
 *     sessionId,
 *     onOutput: (data) => console.log('Received:', data),
 *   });
 *
 *   return (
 *     <div>
 *       <pre>{output}</pre>
 *       <input onKeyDown={(e) => {
 *         if (e.key === 'Enter') sendInput(e.currentTarget.value + '\n');
 *       }} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useTerminal(options: UseTerminalOptions): UseTerminalResult {
  const { sessionId, enabled = true, onOutput, onStatus, onError } = options;

  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<TerminalStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Refs for callbacks
  const onOutputRef = useRef(onOutput);
  const onStatusRef = useRef(onStatus);
  const onErrorRef = useRef(onError);
  onOutputRef.current = onOutput;
  onStatusRef.current = onStatus;
  onErrorRef.current = onError;

  // RPC for sending commands
  const { call, isLoading: isRpcLoading } = useRPC({
    onError: (err) => {
      setError(err);
      onErrorRef.current?.(err);
    },
  });

  // Subscribe to terminal output
  const { isSubscribed: isOutputSubscribed } = useSubscription<TerminalOutput>({
    channel: `terminal#${sessionId}#output`,
    enabled: enabled && !!sessionId,
    onData: (data) => {
      // Decode if base64
      const text = data.data;
      setOutput((prev) => prev + text);
      onOutputRef.current?.(text);
    },
    onError: (err) => {
      setError(err);
      onErrorRef.current?.(err);
    },
  });

  // Subscribe to terminal status
  const { isSubscribed: isStatusSubscribed } = useSubscription<TerminalStatus>({
    channel: `terminal#${sessionId}#status`,
    enabled: enabled && !!sessionId,
    onData: (newStatus) => {
      setStatus(newStatus);
      onStatusRef.current?.(newStatus);
    },
    onError: (err) => {
      setError(err);
      onErrorRef.current?.(err);
    },
  });

  const isConnected = isOutputSubscribed && isStatusSubscribed;

  // Send input to terminal
  const sendInput = useCallback(
    async (data: string): Promise<void> => {
      if (!sessionId) return;
      await call('terminal.input', {
        session_id: sessionId,
        data,
      });
    },
    [call, sessionId]
  );

  // Resize terminal
  const resize = useCallback(
    async (cols: number, rows: number): Promise<void> => {
      if (!sessionId) return;
      await call('terminal.resize', {
        session_id: sessionId,
        cols,
        rows,
      });
    },
    [call, sessionId]
  );

  // Send signal
  const signal = useCallback(
    async (sig: number | string): Promise<void> => {
      if (!sessionId) return;
      const signalNum = typeof sig === 'string' ? signalNameToNumber(sig) : sig;
      await call('terminal.signal', {
        session_id: sessionId,
        signal: signalNum,
      });
    },
    [call, sessionId]
  );

  // Clear output
  const clear = useCallback(() => {
    setOutput('');
  }, []);

  return {
    isConnected,
    isConnecting: isConnecting || isRpcLoading,
    error,
    output,
    status,
    sendInput,
    resize,
    signal,
    clear,
  };
}

// ============================================================================
// Helpers
// ============================================================================

const SIGNAL_MAP: Record<string, number> = {
  SIGHUP: 1,
  SIGINT: 2,
  SIGQUIT: 3,
  SIGKILL: 9,
  SIGTERM: 15,
  SIGSTOP: 19,
  SIGCONT: 18,
};

function signalNameToNumber(name: string): number {
  const upper = name.toUpperCase();
  return SIGNAL_MAP[upper] ?? parseInt(name, 10) ?? 15;
}
