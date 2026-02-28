/**
 * Agent service for AI agent execution on remote agent
 *
 * For local IPC, sessionId is not required (server ignores it).
 * For remote connections, use setSessionId() to set the active session.
 */

import { CMDOPError } from '@cmdop/core';
import { AgentType } from '../proto/generated/control_messages';
import type {
  AgentToolResult as ProtoAgentToolResult,
  AgentUsage as ProtoAgentUsage,
} from '../proto/generated/agent_messages';
import { BaseService } from './base';
import type {
  AgentMode,
  RunAgentOptions,
  ToolResult,
  Usage,
  AgentResult,
} from '../models/agent';
import { AgentStream } from '../streaming/agent';

export type {
  AgentMode,
  RunAgentOptions,
  ToolResult,
  Usage,
  AgentResult,
} from '../models/agent';

export class AgentService extends BaseService {
  async run(prompt: string, options: RunAgentOptions = {}): Promise<AgentResult> {
    // Build the options map — merge user-provided options with SDK-level fields
    const builtOptions: Record<string, string> = { ...(options.options ?? {}) };
    if (options.maxTurns !== undefined)  builtOptions['max_turns']   = String(options.maxTurns);
    if (options.maxRetries !== undefined) builtOptions['max_retries'] = String(options.maxRetries);
    if (options.model !== undefined)     builtOptions['model']        = options.model;

    const response = await this.call(() =>
      this.client.runAgent({
        sessionId: this._sessionId,
        prompt,
        requestId: options.requestId ?? '',
        agentType: mapAgentMode(options.mode ?? 'chat'),
        timeoutSeconds: options.timeoutSeconds ?? 300,
        options: builtOptions,
        outputSchema: options.outputSchema ?? '',
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Agent execution failed');
    }

    return {
      requestId: response.requestId,
      success: response.success,
      text: response.text,
      error: response.error || undefined,
      toolResults: response.toolResults.map(mapToolResult),
      usage: response.usage ? mapUsage(response.usage) : undefined,
      durationMs: parseInt(response.durationMs, 10),
      outputJson: response.outputJson || undefined,
    };
  }

  /**
   * Run agent with streaming events.
   * Returns an AgentStream — call .start() to begin streaming.
   *
   * @example
   * ```typescript
   * const stream = client.agent.stream('List files in /tmp');
   * stream.on((event) => {
   *   if (event.type === 'token') process.stdout.write(event.token);
   * });
   * const result = await stream.start();
   * console.log(result.text);
   * ```
   */
  stream(prompt: string, options: RunAgentOptions = {}): AgentStream {
    return new AgentStream(this.client, this._sessionId, prompt, options);
  }

  async extract<T = unknown>(
    prompt: string,
    outputSchema: string,
    options: Omit<RunAgentOptions, 'outputSchema'> = {}
  ): Promise<T> {
    const result = await this.run(prompt, { ...options, outputSchema });

    if (!result.outputJson) {
      throw new CMDOPError('Agent did not return structured output');
    }

    try {
      return JSON.parse(result.outputJson) as T;
    } catch (e) {
      throw new CMDOPError(`Failed to parse agent output: ${(e as Error).message}`);
    }
  }
}

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

export function mapToolResult(result: ProtoAgentToolResult): ToolResult {
  return {
    toolName: result.toolName,
    toolCallId: result.toolCallId,
    success: result.success,
    result: result.result,
    error: result.error || undefined,
    durationMs: parseInt(result.durationMs, 10),
  };
}

export function mapUsage(usage: ProtoAgentUsage): Usage {
  return {
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
  };
}
