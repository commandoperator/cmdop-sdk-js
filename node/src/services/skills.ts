/**
 * Skills service for listing, showing, and running skills on remote agent
 *
 * For local IPC, sessionId is not required (server ignores it).
 * For remote connections, use setSessionId() to set the active session.
 */

import { CMDOPError } from '@cmdop/core';
import type {
  SkillInfo as ProtoSkillInfo,
  SkillShowResponse as ProtoSkillShowResponse,
  SkillRunResponse as ProtoSkillRunResponse,
} from '../proto/generated/rpc_messages/skills';
import { BaseService } from './base';
import { mapToolResult, mapUsage } from './agent';
import type {
  SkillInfo,
  SkillDetail,
  SkillRunOptions,
  SkillRunResult,
} from '../models/skills';

export type {
  SkillInfo,
  SkillDetail,
  SkillRunOptions,
  SkillRunResult,
} from '../models/skills';

export class SkillsService extends BaseService {
  /**
   * List all installed skills on the connected machine.
   */
  async list(): Promise<SkillInfo[]> {
    const response = await this.call(() =>
      this.client.skillList({ sessionId: this._sessionId })
    );

    if (response.error) {
      throw new CMDOPError(response.error);
    }

    return response.skills.map(mapSkillInfo);
  }

  /**
   * Get details of a specific skill by name.
   */
  async show(skillName: string): Promise<SkillDetail> {
    const response = await this.call(() =>
      this.client.skillShow({ sessionId: this._sessionId, skillName })
    );

    return mapSkillDetail(response);
  }

  /**
   * Execute a skill with a prompt.
   *
   * @throws {CMDOPError} if execution fails
   */
  async run(skillName: string, prompt: string, options: SkillRunOptions = {}): Promise<SkillRunResult> {
    const builtOptions: Record<string, string> = { ...(options.options ?? {}) };
    if (options.model !== undefined) builtOptions['model'] = options.model;

    const response = await this.call(() =>
      this.client.skillRun({
        sessionId: this._sessionId,
        requestId: '',
        skillName,
        prompt,
        options: builtOptions,
        timeoutSeconds: options.timeoutSeconds ?? 300,
        outputSchema: '',
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Skill execution failed');
    }

    return mapSkillRunResult(response);
  }

  /**
   * Run a skill and parse structured JSON output.
   *
   * @param skillName Skill to run
   * @param prompt User prompt
   * @param outputSchema JSON Schema string for structured output
   * @param options Additional run options
   */
  async extract<T = unknown>(
    skillName: string,
    prompt: string,
    outputSchema: string,
    options: Omit<SkillRunOptions, 'outputSchema'> = {},
  ): Promise<T> {
    const builtOptions: Record<string, string> = { ...(options.options ?? {}) };
    if (options.model !== undefined) builtOptions['model'] = options.model;

    const response = await this.call(() =>
      this.client.skillRun({
        sessionId: this._sessionId,
        requestId: '',
        skillName,
        prompt,
        options: builtOptions,
        timeoutSeconds: options.timeoutSeconds ?? 300,
        outputSchema,
      })
    );

    if (!response.success) {
      throw new CMDOPError(response.error || 'Skill execution failed');
    }

    if (!response.outputJson) {
      throw new CMDOPError('Skill did not return structured output');
    }

    try {
      return JSON.parse(response.outputJson) as T;
    } catch (e) {
      throw new CMDOPError(`Failed to parse skill output: ${(e as Error).message}`);
    }
  }
}

function mapSkillInfo(proto: ProtoSkillInfo): SkillInfo {
  return {
    name: proto.name,
    description: proto.description,
    author: proto.author,
    version: proto.version,
    model: proto.model,
    origin: proto.origin,
    requiredBins: proto.requiredBins,
    requiredEnv: proto.requiredEnv,
  };
}

function mapSkillDetail(proto: ProtoSkillShowResponse): SkillDetail {
  return {
    found: proto.found,
    info: proto.info ? mapSkillInfo(proto.info) : undefined,
    content: proto.content,
    source: proto.source,
    error: proto.error || undefined,
  };
}

function mapSkillRunResult(proto: ProtoSkillRunResponse): SkillRunResult {
  return {
    requestId: proto.requestId,
    success: proto.success,
    text: proto.text,
    error: proto.error || undefined,
    toolResults: proto.toolResults.map(mapToolResult),
    usage: proto.usage ? mapUsage(proto.usage) : undefined,
    durationMs: parseInt(proto.durationMs, 10),
    outputJson: proto.outputJson || undefined,
  };
}
