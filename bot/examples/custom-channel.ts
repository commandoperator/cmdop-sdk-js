#!/usr/bin/env tsx
/**
 * Custom Channel Example
 *
 * Shows how to implement ChannelProtocol for any messaging platform
 * not built into @cmdop/bot.
 *
 * This example uses an in-process EventEmitter to simulate a chat platform
 * so it runs without any external dependencies.
 *
 * Run:
 *   pnpm tsx examples/custom-channel.ts
 *
 * The bot will respond to a few simulated messages, then exit.
 */

import { EventEmitter } from 'node:events';
import {
  IntegrationHub,
  BaseChannel,
  createLogger,
  type OutgoingMessage,
  type IncomingMessage,
  type PermissionManager,
  type MessageDispatcher,
  type LoggerProtocol,
} from '../src/index.js';

// ─── Simulated platform types ─────────────────────────────────────────────────

interface PlatformMessage {
  id: string;
  authorId: string;
  text: string;
}

interface PlatformSendEvent {
  toUserId: string;
  text: string;
}

// ─── Custom channel implementation ───────────────────────────────────────────

/**
 * EchoPlatformChannel — a minimal ChannelProtocol implementation.
 *
 * Key points when implementing your own channel:
 *  1. Call `this.processMessage(msg)` from your platform event handler.
 *     BaseChannel takes care of parsing, permission checks, dispatch, and send().
 *  2. Implement `send()` to format and deliver OutgoingMessage to the platform.
 *  3. `onMessage()` is called by the hub to register its own handler —
 *     forward all incoming messages to it too (or just rely on processMessage).
 *  4. `start()` / `stop()` manage the platform connection lifecycle.
 */
class EchoPlatformChannel extends BaseChannel {
  private readonly platform: EventEmitter;
  private readonly hubHandlers: Array<(msg: IncomingMessage) => Promise<void>> = [];

  constructor(
    platform: EventEmitter,
    permissions: PermissionManager,
    dispatcher: MessageDispatcher,
    logger: LoggerProtocol,
  ) {
    // Pass a unique channel id, display name, and the shared hub dependencies
    super('echo', 'Echo Platform', permissions, dispatcher, logger);
    this.platform = platform;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    this.platform.on('message', this.handlePlatformMessage.bind(this));
    this.logEvent('connected');
  }

  async stop(): Promise<void> {
    this.platform.removeAllListeners('message');
    this.logEvent('disconnected');
  }

  // ── Sending ───────────────────────────────────────────────────────────────

  async send(_userId: string, message: OutgoingMessage): Promise<void> {
    const text = this.formatMessage(message);
    const event: PlatformSendEvent = { toUserId: _userId, text };
    this.platform.emit('outgoing', event);
    // In a real channel you'd call the platform SDK here, e.g.:
    //   await platformApi.sendMessage(userId, text);
  }

  // ── Hub handler registration ───────────────────────────────────────────────

  onMessage(handler: (msg: IncomingMessage) => Promise<void>): void {
    // The hub registers its own handler here (for cross-channel routing).
    // We store it and call it in handlePlatformMessage alongside processMessage.
    this.hubHandlers.push(handler);
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private async handlePlatformMessage(raw: PlatformMessage): Promise<void> {
    const msg: IncomingMessage = {
      id: raw.id,
      userId: raw.authorId,
      channelId: this.id,
      text: raw.text,
      timestamp: new Date(),
      attachments: [],
    };

    // 1. Notify hub handlers (cross-channel features, logging, etc.)
    for (const handler of this.hubHandlers) {
      await handler(msg);
    }

    // 2. Parse command → check permission → dispatch → send result
    await this.processMessage(msg);
  }

  private formatMessage(msg: OutgoingMessage): string {
    switch (msg.type) {
      case 'text':
        return msg.text;
      case 'code':
        return `\`\`\`${msg.language ?? ''}\n${msg.code}\n\`\`\``;
      case 'error':
        return `ERROR: ${msg.message}${msg.hint ? ` (${msg.hint})` : ''}`;
    }
  }
}

// ─── Demo run ─────────────────────────────────────────────────────────────────

async function main() {
  const logger = createLogger('info');
  const platform = new EventEmitter();

  // Collect outgoing messages for display
  platform.on('outgoing', (e: PlatformSendEvent) => {
    console.log(`\n→ [to ${e.toUserId}] ${e.text}`);
  });

  // Create hub with local CMDOP connection (or mock)
  // In a real app: IntegrationHub.create({ apiKey: process.env.CMDOP_API_KEY })
  const hub = await IntegrationHub.create({ logger }).catch(() => {
    console.warn('Could not connect to CMDOP — running in demo mode without a real client.');
    process.exit(0);
  });

  // Grant admin to our test user
  await hub.permissions.setLevel('echo:alice', 'ADMIN');

  // Register the custom channel
  const channel = new EchoPlatformChannel(
    platform,
    hub.permissions,
    // Access the dispatcher via the hub's internal structure isn't exposed directly —
    // for custom channels registered via hub.registerChannel(), the hub wires
    // onMessage() to its internal dispatcher after registerChannel().
    // Here we construct the channel and register it:
    (hub as unknown as { _dispatcher: MessageDispatcher })._dispatcher,
    logger,
  );

  hub.registerChannel(channel);
  await hub.start();

  console.log('Custom channel started. Simulating messages...\n');

  // ── Simulate incoming platform messages ────────────────────────────────────

  const send = (authorId: string, text: string) => {
    console.log(`← [from ${authorId}] ${text}`);
    platform.emit('message', {
      id: `msg-${Date.now()}`,
      authorId,
      text,
    } satisfies PlatformMessage);
  };

  // Small delay between messages so async handlers resolve cleanly
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  await delay(50);
  send('alice', '/help');

  await delay(200);
  send('alice', '/exec echo "hello from custom channel"');

  await delay(200);
  send('bob', '/exec ls'); // bob has no permission → PERMISSION_DENIED

  await delay(200);
  send('alice', 'just chatting — not a command, silently ignored');

  await delay(200);

  await hub.stop();
  console.log('\nDone.');
}

main().catch((err: unknown) => {
  console.error('Fatal:', err);
  process.exit(1);
});
