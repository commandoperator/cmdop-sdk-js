/**
 * WebSocket React Provider for CMDOP
 */

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { CMDOPWebSocketClient, type ConnectionState } from './client';

interface WebSocketContextValue {
  client: CMDOPWebSocketClient | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export interface WebSocketProviderProps {
  children: ReactNode;
  /**
   * WebSocket URL (e.g., wss://api.cmdop.com/connection/websocket)
   */
  url: string;
  /**
   * Function to get auth token
   */
  getToken: () => Promise<string>;
  /**
   * Auto-connect on mount
   * @default true
   */
  autoConnect?: boolean;
  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

export function WebSocketProvider({
  children,
  url,
  getToken,
  autoConnect = true,
  debug = false,
}: WebSocketProviderProps) {
  const clientRef = useRef<CMDOPWebSocketClient | null>(null);
  const [state, setState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  // Initialize client
  useEffect(() => {
    const client = new CMDOPWebSocketClient({
      url,
      getToken,
      debug,
    });

    clientRef.current = client;

    // Listen to state changes
    const unsubscribe = client.onStateChange(setState);

    // Auto-connect
    if (autoConnect) {
      client.connect().catch((error) => {
        console.error('[CMDOP WebSocket] Auto-connect failed:', error);
      });
    }

    return () => {
      unsubscribe();
      client.disconnect();
      clientRef.current = null;
    };
  }, [url, getToken, autoConnect, debug]);

  const connect = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
  }, []);

  const value: WebSocketContextValue = {
    client: clientRef.current,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    connect,
    disconnect,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

/**
 * Hook to access WebSocket context
 */
export function useWebSocket(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
