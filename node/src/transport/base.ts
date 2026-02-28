/**
 * Base transport class with shared channel/client lifecycle logic
 */

import { createChannel, createClient, type Channel, type ChannelCredentials } from 'nice-grpc';
import { ConnectionError } from '@cmdop/core';

import {
  TerminalStreamingServiceDefinition,
  type TerminalStreamingServiceClient,
} from '../proto/generated/service';
import type { Transport } from './types';
import { getSettings, type SDKSettings } from '../config';

/** gRPC channel options derived from SDK settings */
interface ChannelOptions {
  'grpc.keepalive_time_ms': number;
  'grpc.keepalive_timeout_ms': number;
  'grpc.keepalive_permit_without_calls': number;
  'grpc.http2.min_time_between_pings_ms': number;
}

function buildChannelOptions(s: SDKSettings): ChannelOptions {
  return {
    'grpc.keepalive_time_ms': s.keepaliveIntervalMs,
    'grpc.keepalive_timeout_ms': 5_000,
    'grpc.keepalive_permit_without_calls': 1,
    'grpc.http2.min_time_between_pings_ms': s.keepaliveIntervalMs,
  };
}

export abstract class BaseTransport implements Transport {
  protected _channel: Channel | null = null;
  protected _client: TerminalStreamingServiceClient | null = null;
  protected readonly _address: string;

  constructor(address: string) {
    this._address = address;
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

  /** Ensure the gRPC channel is created. Idempotent. */
  private _ensureChannel(): void {
    if (this._channel) return;
    const opts = buildChannelOptions(getSettings());
    this._channel = createChannel(
      this._address,
      this._getCredentials(),
      { ...opts, ...this._getChannelOptions() },
    );
  }

  async connect(): Promise<void> {
    this._ensureChannel();
  }

  async close(): Promise<void> {
    if (this._channel) {
      this._channel.close();
      this._channel = null;
      this._client = null;
    }
  }

  createClient(): TerminalStreamingServiceClient {
    if (!this._client) {
      this._ensureChannel();
      this._client = this._buildClient();
    }
    return this._client;
  }

  abstract setAgentId(agentId: string): void;

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }

  /** Override to provide TLS or insecure credentials. Default: insecure (undefined). */
  protected _getCredentials(): ChannelCredentials | undefined {
    return undefined;
  }

  /** Override to add extra channel options (e.g. max message size). */
  protected _getChannelOptions(): Record<string, unknown> {
    return {};
  }

  /** Override to wrap the raw client (e.g. inject auth metadata). */
  protected _buildClient(): TerminalStreamingServiceClient {
    return createClient(TerminalStreamingServiceDefinition, this.channel);
  }
}
