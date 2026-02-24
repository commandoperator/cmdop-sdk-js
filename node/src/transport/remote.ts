/**
 * Remote transport for connecting to cmdop agent via cloud relay (grpc.cmdop.com)
 */

import { createChannel, createClient, type Channel, type CallOptions } from 'nice-grpc';
import { Metadata } from 'nice-grpc-common';
import { ChannelCredentials } from '@grpc/grpc-js';
import { ConnectionError, AuthenticationError } from '@cmdop/core';

import {
  TerminalStreamingServiceDefinition,
  type TerminalStreamingServiceClient,
} from '../generated/service';
import type { Transport, RemoteTransportOptions } from './types';
import { DEFAULT_CHANNEL_OPTIONS, DEFAULT_SERVER } from './types';

/**
 * Remote transport for cloud relay connection
 */
export class RemoteTransport implements Transport {
  private _channel: Channel | null = null;
  private _client: TerminalStreamingServiceClient | null = null;
  private _address: string;
  private _apiKey: string;
  private _agentId?: string;

  constructor(options: RemoteTransportOptions) {
    if (!options.apiKey) {
      throw new AuthenticationError('API key is required for remote transport');
    }

    this._apiKey = options.apiKey;
    this._agentId = options.agentId;
    this._address = options.server ?? DEFAULT_SERVER;
  }

  get channel(): Channel {
    if (!this._channel) {
      throw new ConnectionError('Transport not connected');
    }
    return this._channel;
  }

  get isConnected(): boolean {
    return this._channel !== null;
  }

  get address(): string {
    return this._address;
  }

  get agentId(): string | undefined {
    return this._agentId;
  }

  async connect(): Promise<void> {
    if (this._channel) {
      return; // Already connected
    }

    // Create TLS credentials for secure connection
    const credentials = ChannelCredentials.createSsl();

    this._channel = createChannel(this._address, credentials, {
      ...DEFAULT_CHANNEL_OPTIONS,
      // Additional options for remote connection
      'grpc.max_receive_message_length': 16 * 1024 * 1024, // 16MB
      'grpc.max_send_message_length': 16 * 1024 * 1024,
    });
  }

  async close(): Promise<void> {
    if (this._channel) {
      this._channel.close();
      this._channel = null;
      this._client = null;
    }
  }

  /**
   * Create authenticated gRPC client with middleware
   */
  createClient(): TerminalStreamingServiceClient {
    if (!this._client) {
      const rawClient = createClient(TerminalStreamingServiceDefinition, this.channel);

      // Wrap client to inject auth metadata on every call
      this._client = this._createAuthenticatedClient(rawClient);
    }
    return this._client;
  }

  /**
   * Set agent ID for routing requests to a specific machine.
   * This updates the x-agent-id header used in all subsequent requests.
   */
  setAgentId(agentId: string): void {
    if (this._agentId !== agentId) {
      this._agentId = agentId;
      // Invalidate cached client so next createClient() creates new proxy with updated agentId
      this._client = null;
    }
  }

  /**
   * Create a client wrapper that injects authentication metadata
   */
  private _createAuthenticatedClient(
    rawClient: TerminalStreamingServiceClient
  ): TerminalStreamingServiceClient {
    const self = this;

    // Create a proxy that intercepts all method calls
    return new Proxy(rawClient, {
      get(target, prop: string) {
        const method = target[prop as keyof TerminalStreamingServiceClient];

        if (typeof method !== 'function') {
          return method;
        }

        // Return wrapped method that injects metadata
        return function (request: unknown, options?: CallOptions) {
          let metadata = Metadata();
          metadata = metadata.set('authorization', `Bearer ${self._apiKey}`);

          if (self._agentId) {
            metadata = metadata.set('x-agent-id', self._agentId);
          }

          // Merge with existing options
          const enhancedOptions: CallOptions = {
            ...options,
            metadata: options?.metadata
              ? mergeMetadata(options.metadata as Metadata, metadata)
              : metadata,
          };

          return (method as Function).call(target, request, enhancedOptions);
        };
      },
    });
  }

  /**
   * Explicit resource management (TypeScript 5.2+)
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}

/**
 * Merge two metadata objects
 */
function mergeMetadata(existing: Metadata, additional: Metadata): Metadata {
  let merged = Metadata();

  // Copy existing entries
  for (const [key, value] of existing) {
    merged = merged.set(key, value);
  }

  // Override with additional entries
  for (const [key, value] of additional) {
    merged = merged.set(key, value);
  }

  return merged;
}
