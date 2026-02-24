/**
 * Centrifugo WebSocket client for CMDOP
 * Simplified implementation based on @djangocfg/centrifugo patterns
 */

import { Centrifuge, Subscription, PublicationContext } from 'centrifuge';

export interface CMDOPWebSocketConfig {
  url: string;
  getToken: () => Promise<string>;
  timeout?: number;
  debug?: boolean;
}

export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
}

export type ConnectionStateListener = (state: ConnectionState) => void;

/**
 * CMDOP WebSocket client wrapping Centrifuge
 */
export class CMDOPWebSocketClient {
  private centrifuge: Centrifuge | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private stateListeners: Set<ConnectionStateListener> = new Set();
  private state: ConnectionState = {
    isConnected: false,
    isConnecting: false,
    error: null,
  };

  constructor(private config: CMDOPWebSocketConfig) {}

  /**
   * Connect to Centrifugo server
   */
  async connect(): Promise<void> {
    if (this.centrifuge) {
      return;
    }

    this.updateState({ isConnecting: true, error: null });

    try {
      const token = await this.config.getToken();

      this.centrifuge = new Centrifuge(this.config.url, {
        token,
        getToken: async () => {
          return this.config.getToken();
        },
        debug: this.config.debug ?? false,
      });

      this.centrifuge.on('connected', () => {
        this.updateState({ isConnected: true, isConnecting: false, error: null });
      });

      this.centrifuge.on('disconnected', () => {
        this.updateState({ isConnected: false, isConnecting: false });
      });

      this.centrifuge.on('error', (ctx) => {
        this.updateState({ error: new Error(ctx.error?.message ?? 'Connection error') });
      });

      this.centrifuge.connect();
    } catch (error) {
      this.updateState({
        isConnecting: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.centrifuge) {
      // Unsubscribe from all channels
      this.subscriptions.forEach((sub) => sub.unsubscribe());
      this.subscriptions.clear();

      this.centrifuge.disconnect();
      this.centrifuge = null;
      this.updateState({ isConnected: false, isConnecting: false });
    }
  }

  /**
   * Subscribe to a channel
   */
  subscribe<T = unknown>(
    channel: string,
    onPublication: (data: T) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!this.centrifuge) {
      throw new Error('Not connected');
    }

    // Reuse existing subscription
    if (this.subscriptions.has(channel)) {
      const existing = this.subscriptions.get(channel)!;
      existing.on('publication', (ctx: PublicationContext) => {
        onPublication(ctx.data as T);
      });
      return () => this.unsubscribe(channel);
    }

    const subscription = this.centrifuge.newSubscription(channel);

    subscription.on('publication', (ctx: PublicationContext) => {
      onPublication(ctx.data as T);
    });

    subscription.on('error', (ctx) => {
      onError?.(new Error(ctx.error?.message ?? 'Subscription error'));
    });

    subscription.subscribe();
    this.subscriptions.set(channel, subscription);

    return () => this.unsubscribe(channel);
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string): void {
    const subscription = this.subscriptions.get(channel);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(channel);
    }
  }

  /**
   * Make an RPC call via Centrifugo (namedRPC compatible)
   */
  async rpc<TRequest, TResponse>(method: string, data: TRequest): Promise<TResponse> {
    if (!this.centrifuge) {
      throw new Error('Not connected');
    }

    const result = await this.centrifuge.rpc(method, data);
    return result.data as TResponse;
  }

  /**
   * Alias for rpc() - compatible with generated APIClient interface
   */
  async namedRPC<TResponse = unknown>(
    method: string,
    params: unknown,
    _options?: { timeout?: number }
  ): Promise<TResponse> {
    return this.rpc<unknown, TResponse>(method, params);
  }

  /**
   * Publish to a channel (fire-and-forget)
   */
  async publish<T>(channel: string, data: T): Promise<void> {
    if (!this.centrifuge) {
      throw new Error('Not connected');
    }

    const subscription = this.subscriptions.get(channel);
    if (subscription) {
      await subscription.publish(data);
    }
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return { ...this.state };
  }

  /**
   * Add state change listener
   */
  onStateChange(listener: ConnectionStateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private updateState(partial: Partial<ConnectionState>): void {
    this.state = { ...this.state, ...partial };
    this.stateListeners.forEach((listener) => listener(this.state));
  }
}
