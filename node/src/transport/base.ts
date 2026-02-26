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
import { getSettings } from '../config';

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

  async connect(): Promise<void> {
    if (this._channel) {
      return;
    }
    const s = getSettings();
    const baseOptions = {
      'grpc.keepalive_time_ms': s.keepaliveIntervalMs,
      'grpc.keepalive_timeout_ms': 5_000,
      'grpc.keepalive_permit_without_calls': 1,
      'grpc.http2.min_time_between_pings_ms': s.keepaliveIntervalMs,
    };
    this._channel = createChannel(
      this._address,
      this._getCredentials(),
      { ...baseOptions, ...this._getChannelOptions() }
    );
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
