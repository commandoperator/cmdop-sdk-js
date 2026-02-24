/**
 * WebSocket module for CMDOP React SDK
 *
 * Provides:
 * - CMDOPWebSocketClient: Low-level WebSocket client
 * - WebSocketProvider: React context provider
 * - useSubscription: Hook for channel subscriptions
 * - useRPC: Hook for RPC calls
 * - APIClient: Auto-generated typed RPC methods (from ./generated/)
 */

// Core client
export { CMDOPWebSocketClient, type CMDOPWebSocketConfig, type ConnectionState } from './client';

// React provider and hooks
export { WebSocketProvider, useWebSocket, type WebSocketProviderProps } from './provider';
export {
  useSubscription,
  useRPC,
  type UseSubscriptionOptions,
  type UseSubscriptionResult,
  type UseRPCOptions,
  type UseRPCResult,
} from './hooks';

// Auto-generated typed API client and types
export { APIClient, API_VERSION, GENERATED_AT } from './generated/index';
export * from './generated/types';
