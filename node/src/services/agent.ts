/**
 * Agent service for AI agent execution on remote agent
 *
 * For local IPC, sessionId is not required (server ignores it).
 * For remote connections, use setSessionId() to set the active session.
 *
 * Example:
 *   // Local IPC - just use methods directly
 *   const result = await client.agent.run('What is 2 + 2?');
 *
 *   // Remote - set session first
 *   client.agent.setSessionId(session.sessionId);
 *   const result = await client.agent.run('What is 2 + 2?');
 */

import { CMDOPError } from '@cmdop/core';
import type { TerminalStreamingServiceClient } from '../generated/service';
import { AgentType } from '../generated/control_messages';
import type {
  AgentToolResult as ProtoAgentToolResult,
  AgentUsage as ProtoAgentUsage,
} from '../generated/agent_messages';

/**
 * Agent type for different execution modes
 */
export type AgentMode = 'chat' | 'terminal' | 'command' | 'router' | 'planner';

/**
 * Options for running an agent
 */
export interface RunAgentOptions {
  /**
   * Agent type/mode (default: 'chat')
   */
  mode?: AgentMode;

  /**
   * Maximum execution time in seconds (default: 300, max: 600)
   */
  timeoutSeconds?: number;

  /**
   * Additional configuration options (key-value pairs)
   */
  options?: Record<string, string>;

  /**
   * JSON Schema for structured output (Pydantic model schema)
   * If provided, agent will return outputJson instead of text
   */
  outputSchema?: string;

  /**
   * Unique request ID for correlation (auto-generated if not provided)
   */
  requestId?: string;
}

/**
 * Tool execution result from agent
 */
export interface ToolResult {
  toolName: string;
  toolCallId: string;
  success: boolean;
  result: string;
  error?: string;
  durationMs: number;
}

/**
 * Token usage statistics
 */
export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Result from agent execution
 */
export interface AgentResult {
  /**
   * Request ID for correlation
   */
  requestId: string;

  /**
   * Whether execution succeeded
   */
  success: boolean;

  /**
   * Agent's response text
   */
  text: string;

  /**
   * Error message if not success
   */
  error?: string;

  /**
   * Tool execution results (if agent used tools)
   */
  toolResults: ToolResult[];

  /**
   * Token usage statistics
   */
  usage?: Usage;

  /**
   * Execution duration in milliseconds
   */
  durationMs: number;

  /**
   * Structured output JSON (if outputSchema was provided in request)
   */
  outputJson?: string;
}

/**
 * Agent service for AI agent execution
 *
 * @example Local IPC (no session needed)
 * ```typescript
 * const result = await client.agent.run('What is 2 + 2?');
 * console.log(result.text);
 * ```
 *
 * @example Remote (session required)
 * ```typescript
 * client.agent.setSessionId(session.sessionId);
 * const result = await client.agent.run('What is 2 + 2?');
 * ```
 */
export class AgentService {
  private _sessionId: string = '';

  constructor(private readonly client: TerminalStreamingServiceClient) {}

  /**
   * Set session ID for remote operations.
   * Not needed for local IPC.
   */
  setSessionId(sessionId: string): void {
    this._sessionId = sessionId;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this._sessionId;
  }

  /**
   * Run AI agent with a prompt
   *
   * @param prompt - User prompt/question for the agent
   * @param options - Optional configuration
   * @returns Agent execution result
   *
   * @example Basic usage
   * ```typescript
   * const result = await client.agent.run('What is 2 + 2?');
   * console.log(result.text);
   * ```
   *
   * @example With structured output
   * ```typescript
   * const schema = JSON.stringify({
   *   type: 'object',
   *   properties: { files: { type: 'array', items: { type: 'string' } } }
   * });
   * const result = await client.agent.run('List files', { outputSchema: schema });
   * const data = JSON.parse(result.outputJson!);
   * ```
   */
  async run(prompt: string, options: RunAgentOptions = {}): Promise<AgentResult> {
    const response = await this.client.runAgent({
      sessionId: this._sessionId,
      prompt,
      requestId: options.requestId ?? '',
      agentType: mapAgentMode(options.mode ?? 'chat'),
      timeoutSeconds: options.timeoutSeconds ?? 300,
      options: options.options ?? {},
      outputSchema: options.outputSchema ?? '',
    });

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
   * Run agent and return structured output
   *
   * Convenience method that parses outputJson automatically.
   *
   * @param prompt - User prompt/question for the agent
   * @param outputSchema - JSON Schema for expected output
   * @param options - Optional configuration
   * @returns Parsed structured output
   *
   * @example
   * ```typescript
   * interface FileList { files: string[] }
   * const schema = JSON.stringify({
   *   type: 'object',
   *   properties: { files: { type: 'array', items: { type: 'string' } } }
   * });
   * const data = await client.agent.extract<FileList>('List files', schema);
   * console.log(data.files);
   * ```
   */
  async extract<T = unknown>(
    prompt: string,
    outputSchema: string,
    options: Omit<RunAgentOptions, 'outputSchema'> = {}
  ): Promise<T> {
    const result = await this.run(prompt, {
      ...options,
      outputSchema,
    });

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

/**
 * Map SDK AgentMode to proto AgentType
 */
function mapAgentMode(mode: AgentMode): AgentType {
  switch (mode) {
    case 'chat':
      return AgentType.AGENT_TYPE_CHAT;
    case 'terminal':
      return AgentType.AGENT_TYPE_TERMINAL;
    case 'command':
      return AgentType.AGENT_TYPE_COMMAND;
    case 'router':
      return AgentType.AGENT_TYPE_ROUTER;
    case 'planner':
      return AgentType.AGENT_TYPE_PLANNER;
    default:
      return AgentType.AGENT_TYPE_CHAT;
  }
}

/**
 * Map proto AgentToolResult to SDK ToolResult
 */
function mapToolResult(result: ProtoAgentToolResult): ToolResult {
  return {
    toolName: result.toolName,
    toolCallId: result.toolCallId,
    success: result.success,
    result: result.result,
    error: result.error || undefined,
    durationMs: parseInt(result.durationMs, 10),
  };
}

/**
 * Map proto AgentUsage to SDK Usage
 */
function mapUsage(usage: ProtoAgentUsage): Usage {
  return {
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
  };
}
