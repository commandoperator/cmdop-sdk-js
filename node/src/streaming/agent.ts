/**
 * AgentStream - streaming wrapper for runAgentStream gRPC call
 */

import { CMDOPError } from '@cmdop/core';
import { AgentEventType } from '../proto/generated/agent_messages';
import type { RunAgentStreamResponse } from '../proto/generated/rpc_messages/agent';
import type { TerminalStreamingServiceClient } from '../proto/generated/service';
import { mapGrpcError } from '../errors';
import type { RunAgentOptions, AgentResult } from '../models/agent';
import { AgentType } from '../proto/generated/control_messages';
import {
  StreamState,
  type AgentStreamEvent,
  type AgentStreamCallback,
} from './base';

type AgentMode = 'chat' | 'terminal' | 'command' | 'router' | 'planner' | 'browser' | 'scraper' | 'form_filler';

function mapAgentMode(mode: AgentMode): AgentType {
  switch (mode) {
    case 'chat':        return AgentType.AGENT_TYPE_CHAT;
    case 'terminal':    return AgentType.AGENT_TYPE_TERMINAL;
    case 'command':     return AgentType.AGENT_TYPE_COMMAND;
    case 'router':      return AgentType.AGENT_TYPE_ROUTER;
    case 'planner':     return AgentType.AGENT_TYPE_PLANNER;
    case 'browser':     return AgentType.AGENT_TYPE_BROWSER;
    case 'scraper':     return AgentType.AGENT_TYPE_SCRAPER;
    case 'form_filler': return AgentType.AGENT_TYPE_FORM_FILLER;
    default:            return AgentType.AGENT_TYPE_CHAT;
  }
}

export class AgentStream {
  private _state: StreamState = StreamState.IDLE;
  private _listeners: AgentStreamCallback[] = [];
  private _abortController: AbortController | null = null;

  private readonly _client: TerminalStreamingServiceClient;
  private readonly _sessionId: string;
  private readonly _prompt: string;
  private readonly _options: RunAgentOptions;

  constructor(
    client: TerminalStreamingServiceClient,
    sessionId: string,
    prompt: string,
    options: RunAgentOptions = {}
  ) {
    this._client = client;
    this._sessionId = sessionId;
    this._prompt = prompt;
    this._options = options;
  }

  get state(): StreamState {
    return this._state;
  }

  private _getState(): StreamState {
    return this._state;
  }

  on(callback: AgentStreamCallback): this {
    this._listeners.push(callback);
    return this;
  }

  off(callback: AgentStreamCallback): this {
    this._listeners = this._listeners.filter((l) => l !== callback);
    return this;
  }

  /**
   * Start streaming. Returns a Promise that resolves with the final AgentResult
   * when streaming completes, or rejects on error.
   */
  async start(): Promise<AgentResult> {
    if (this._state !== StreamState.IDLE) {
      throw new CMDOPError('AgentStream already started');
    }

    this._state = StreamState.CONNECTING;
    this._abortController = new AbortController();

    try {
      const builtOptions: Record<string, string> = { ...(this._options.options ?? {}) };
      if (this._options.maxTurns !== undefined)   builtOptions['max_turns']   = String(this._options.maxTurns);
      if (this._options.maxRetries !== undefined) builtOptions['max_retries'] = String(this._options.maxRetries);
      if (this._options.model !== undefined)      builtOptions['model']       = this._options.model;

      const iterable = this._client.runAgentStream(
        {
          sessionId: this._sessionId,
          prompt: this._prompt,
          requestId: this._options.requestId ?? '',
          agentType: mapAgentMode(this._options.mode ?? 'chat'),
          timeoutSeconds: this._options.timeoutSeconds ?? 300,
          options: builtOptions,
          outputSchema: this._options.outputSchema ?? '',
        },
        { signal: this._abortController.signal }
      );

      this._state = StreamState.CONNECTED;

      let finalResult: AgentResult | undefined;

      for await (const msg of iterable) {
        if (this._getState() === StreamState.CLOSING) {
          break;
        }
        this._handleMessage(msg);
        if (msg.isFinal && msg.result) {
          finalResult = this._buildResult(msg.result);
        }
      }

      this._state = StreamState.CLOSED;

      if (!finalResult) {
        throw new CMDOPError('Agent stream ended without a final result');
      }

      return finalResult;
    } catch (err) {
      if (this._getState() === StreamState.CLOSING) {
        this._state = StreamState.CLOSED;
        throw new CMDOPError('Agent stream cancelled');
      }
      this._state = StreamState.ERROR;
      throw mapGrpcError(err);
    }
  }

  /**
   * Cancel the running stream
   */
  cancel(): void {
    const s = this._getState();
    if (s === StreamState.CONNECTED || s === StreamState.CONNECTING) {
      this._state = StreamState.CLOSING;
      this._abortController?.abort();
    }
  }

  private _emit(event: AgentStreamEvent): void {
    for (const listener of this._listeners) {
      try {
        listener(event);
      } catch {
        // ignore listener errors
      }
    }
  }

  private _handleMessage(msg: RunAgentStreamResponse): void {
    if (msg.isFinal) {
      // Final result is handled in start() after loop
      return;
    }

    const event = msg.event;
    if (!event) return;

    const requestId = event.requestId;
    const timestamp = parseInt(event.timestamp, 10) || Date.now();

    switch (event.type) {
      case AgentEventType.AGENT_EVENT_TOKEN:
        this._emit({ type: 'token', requestId, token: event.payload, timestamp });
        break;
      case AgentEventType.AGENT_EVENT_TOOL_START:
        this._emit({ type: 'tool_start', requestId, toolName: '', payload: event.payload, timestamp });
        break;
      case AgentEventType.AGENT_EVENT_TOOL_END:
        this._emit({ type: 'tool_end', requestId, toolName: '', payload: event.payload, timestamp });
        break;
      case AgentEventType.AGENT_EVENT_THINKING:
        this._emit({ type: 'thinking', requestId, payload: event.payload, timestamp });
        break;
      case AgentEventType.AGENT_EVENT_ERROR:
        this._emit({ type: 'error', requestId, message: event.payload, timestamp });
        break;
      case AgentEventType.AGENT_EVENT_HANDOFF:
        this._emit({ type: 'handoff', requestId, payload: event.payload, timestamp });
        break;
      case AgentEventType.AGENT_EVENT_CANCELLED:
        this._emit({ type: 'cancelled', requestId, timestamp });
        break;
    }
  }

  private _buildResult(response: NonNullable<RunAgentStreamResponse['result']>): AgentResult {
    return {
      requestId: response.requestId,
      success: response.success,
      text: response.text,
      error: response.error || undefined,
      toolResults: response.toolResults.map((r) => ({
        toolName: r.toolName,
        toolCallId: r.toolCallId,
        success: r.success,
        result: r.result,
        error: r.error || undefined,
        durationMs: parseInt(r.durationMs, 10),
      })),
      usage: response.usage
        ? {
            promptTokens: response.usage.promptTokens,
            completionTokens: response.usage.completionTokens,
            totalTokens: response.usage.totalTokens,
          }
        : undefined,
      durationMs: parseInt(response.durationMs, 10),
      outputJson: response.outputJson || undefined,
    };
  }
}
