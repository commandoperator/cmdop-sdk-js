/**
 * Remote transport for connecting to cmdop agent via cloud relay (grpc.cmdop.com)
 */

import { createClient, type CallOptions } from 'nice-grpc';
import { ChannelCredentials } from '@grpc/grpc-js';
import { Metadata } from 'nice-grpc-common';
import { AuthenticationError } from '@cmdop/core';

import {
  TerminalStreamingServiceDefinition,
  type TerminalStreamingServiceClient,
} from '../proto/generated/service';
import type { RemoteTransportOptions } from './types';
import { DEFAULT_SERVER } from './types';
import { BaseTransport } from './base';
import { getSettings } from '../config';

/**
 * Remote transport for cloud relay connection
 */
export class RemoteTransport extends BaseTransport {
  private readonly _apiKey: string;
  private _agentId?: string;

  constructor(options: RemoteTransportOptions) {
    if (!options.apiKey) {
      throw new AuthenticationError('API key is required for remote transport');
    }
    super(options.server ?? getSettings().grpcServer ?? DEFAULT_SERVER);
    this._apiKey = options.apiKey;
    this._agentId = options.agentId;
  }

  get agentId(): string | undefined {
    return this._agentId;
  }

  /**
   * Set agent ID for routing requests to a specific machine.
   * Invalidates the cached client so next call picks up new x-agent-id header.
   */
  setAgentId(agentId: string): void {
    if (this._agentId !== agentId) {
      this._agentId = agentId;
      this._client = null;
    }
  }

  protected _getCredentials(): ChannelCredentials {
    return ChannelCredentials.createSsl();
  }

  protected _getChannelOptions(): Record<string, unknown> {
    const { maxMessageSize } = getSettings();
    return {
      'grpc.max_receive_message_length': maxMessageSize,
      'grpc.max_send_message_length': maxMessageSize,
    };
  }

  protected _buildClient(): TerminalStreamingServiceClient {
    const rawClient = createClient(TerminalStreamingServiceDefinition, this.channel);
    return this._createAuthenticatedClient(rawClient);
  }

  private _createAuthenticatedClient(
    rawClient: TerminalStreamingServiceClient
  ): TerminalStreamingServiceClient {
    const self = this;

    return new Proxy(rawClient, {
      get(target, prop: string) {
        const method = target[prop as keyof TerminalStreamingServiceClient];

        if (typeof method !== 'function') {
          return method;
        }

        return function (request: unknown, options?: CallOptions) {
          let metadata = Metadata();
          metadata = metadata.set('authorization', `Bearer ${self._apiKey}`);

          if (self._agentId) {
            metadata = metadata.set('x-agent-id', self._agentId);
          }

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
}

function mergeMetadata(existing: Metadata, additional: Metadata): Metadata {
  let merged = Metadata();
  for (const [key, value] of existing) {
    merged = merged.set(key, value);
  }
  for (const [key, value] of additional) {
    merged = merged.set(key, value);
  }
  return merged;
}
