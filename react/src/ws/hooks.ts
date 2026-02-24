/**
 * WebSocket React hooks for CMDOP
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './provider';

// ============================================================================
// useSubscription
// ============================================================================

export interface UseSubscriptionOptions<T> {
  /**
   * Channel to subscribe to
   */
  channel: string;
  /**
   * Enable/disable subscription
   * @default true
   */
  enabled?: boolean;
  /**
   * Callback when data is received
   */
  onData?: (data: T) => void;
  /**
   * Callback on error
   */
  onError?: (error: Error) => void;
}

export interface UseSubscriptionResult<T> {
  /**
   * Last received data
   */
  data: T | null;
  /**
   * Subscription error
   */
  error: Error | null;
  /**
   * Whether subscribed
   */
  isSubscribed: boolean;
}

/**
 * Subscribe to a Centrifugo channel
 */
export function useSubscription<T = unknown>(
  options: UseSubscriptionOptions<T>
): UseSubscriptionResult<T> {
  const { channel, enabled = true, onData, onError } = options;
  const { client, isConnected } = useWebSocket();

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Use refs for callbacks to avoid re-subscriptions
  const onDataRef = useRef(onData);
  const onErrorRef = useRef(onError);
  onDataRef.current = onData;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!client || !isConnected || !enabled || !channel) {
      setIsSubscribed(false);
      return;
    }

    const handleData = (received: T) => {
      setData(received);
      onDataRef.current?.(received);
    };

    const handleError = (err: Error) => {
      setError(err);
      onErrorRef.current?.(err);
    };

    try {
      const unsubscribe = client.subscribe<T>(channel, handleData, handleError);
      setIsSubscribed(true);
      setError(null);

      return () => {
        unsubscribe();
        setIsSubscribed(false);
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onErrorRef.current?.(error);
    }
  }, [client, isConnected, enabled, channel]);

  return { data, error, isSubscribed };
}

// ============================================================================
// useRPC
// ============================================================================

export interface UseRPCOptions {
  /**
   * Callback on error
   */
  onError?: (error: Error) => void;
}

export interface UseRPCResult {
  /**
   * Make an RPC call
   */
  call: <TRequest, TResponse>(method: string, data: TRequest) => Promise<TResponse>;
  /**
   * Loading state
   */
  isLoading: boolean;
  /**
   * Last error
   */
  error: Error | null;
  /**
   * Reset error state
   */
  reset: () => void;
}

/**
 * Make RPC calls via Centrifugo
 */
export function useRPC(options: UseRPCOptions = {}): UseRPCResult {
  const { onError } = options;
  const { client, isConnected } = useWebSocket();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const call = useCallback(
    async <TRequest, TResponse>(method: string, data: TRequest): Promise<TResponse> => {
      if (!client || !isConnected) {
        const err = new Error('WebSocket not connected');
        setError(err);
        onErrorRef.current?.(err);
        throw err;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await client.rpc<TRequest, TResponse>(method, data);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onErrorRef.current?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [client, isConnected]
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { call, isLoading, error, reset };
}
