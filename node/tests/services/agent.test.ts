import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentService } from '../../src/services/agent';
import type { TerminalStreamingServiceClient } from '../../src/proto/generated/service';
import { AgentType } from '../../src/proto/generated/control_messages';

// Create mock client
function createMockClient(): TerminalStreamingServiceClient {
  return {
    runAgent: vi.fn(),
  } as unknown as TerminalStreamingServiceClient;
}

describe('AgentService', () => {
  let client: TerminalStreamingServiceClient;
  let service: AgentService;

  beforeEach(() => {
    client = createMockClient();
    service = new AgentService(client);
    service.setSessionId('sess-123');
  });

  describe('run', () => {
    it('should run agent with prompt', async () => {
      vi.mocked(client.runAgent).mockResolvedValue({
        requestId: 'req-123',
        success: true,
        text: 'Here are the files in /tmp...',
        error: '',
        toolResults: [],
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
        durationMs: '1500',
        outputJson: '',
      });

      const result = await service.run('List files in /tmp');

      expect(client.runAgent).toHaveBeenCalledWith({
        sessionId: 'sess-123',
        prompt: 'List files in /tmp',
        requestId: '',
        agentType: AgentType.AGENT_TYPE_CHAT,
        timeoutSeconds: 300,
        options: {},
        outputSchema: '',
      });

      expect(result.success).toBe(true);
      expect(result.text).toBe('Here are the files in /tmp...');
      expect(result.usage?.totalTokens).toBe(150);
      expect(result.durationMs).toBe(1500);
    });

    it('should use specified agent mode', async () => {
      vi.mocked(client.runAgent).mockResolvedValue({
        requestId: 'req-456',
        success: true,
        text: 'Command executed',
        error: '',
        toolResults: [],
        usage: undefined,
        durationMs: '500',
        outputJson: '',
      });

      await service.run('Run ls', { mode: 'terminal' });

      expect(client.runAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          agentType: AgentType.AGENT_TYPE_TERMINAL,
        })
      );
    });

    it('should pass timeout option', async () => {
      vi.mocked(client.runAgent).mockResolvedValue({
        requestId: 'req-789',
        success: true,
        text: 'Done',
        error: '',
        toolResults: [],
        usage: undefined,
        durationMs: '100',
        outputJson: '',
      });

      await service.run('Quick task', { timeoutSeconds: 60 });

      expect(client.runAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          timeoutSeconds: 60,
        })
      );
    });

    it('should include tool results', async () => {
      vi.mocked(client.runAgent).mockResolvedValue({
        requestId: 'req-tool',
        success: true,
        text: 'Found 3 files',
        error: '',
        toolResults: [
          {
            toolName: 'list_files',
            toolCallId: 'call-1',
            success: true,
            result: '["file1.txt", "file2.txt", "file3.txt"]',
            error: '',
            durationMs: '50',
          },
        ],
        usage: undefined,
        durationMs: '200',
        outputJson: '',
      });

      const result = await service.run('List files');

      expect(result.toolResults).toHaveLength(1);
      expect(result.toolResults[0]?.toolName).toBe('list_files');
      expect(result.toolResults[0]?.success).toBe(true);
      expect(result.toolResults[0]?.durationMs).toBe(50);
    });

    it('should throw on failure', async () => {
      vi.mocked(client.runAgent).mockResolvedValue({
        requestId: 'req-err',
        success: false,
        text: '',
        error: 'Agent timed out',
        toolResults: [],
        usage: undefined,
        durationMs: '30000',
        outputJson: '',
      });

      await expect(service.run('Long task')).rejects.toThrow('Agent timed out');
    });

    it('should handle structured output', async () => {
      vi.mocked(client.runAgent).mockResolvedValue({
        requestId: 'req-json',
        success: true,
        text: '',
        error: '',
        toolResults: [],
        usage: undefined,
        durationMs: '100',
        outputJson: '{"files": ["a.txt", "b.txt"]}',
      });

      const result = await service.run('List files', {
        outputSchema: '{"type": "object"}',
      });

      expect(result.outputJson).toBe('{"files": ["a.txt", "b.txt"]}');
    });

    it('should map all agent modes', async () => {
      const modes: Array<{ mode: 'chat' | 'terminal' | 'command' | 'router' | 'planner' | 'browser' | 'scraper' | 'form_filler'; type: AgentType }> = [
        { mode: 'chat',        type: AgentType.AGENT_TYPE_CHAT },
        { mode: 'terminal',    type: AgentType.AGENT_TYPE_TERMINAL },
        { mode: 'command',     type: AgentType.AGENT_TYPE_COMMAND },
        { mode: 'router',      type: AgentType.AGENT_TYPE_ROUTER },
        { mode: 'planner',     type: AgentType.AGENT_TYPE_PLANNER },
        { mode: 'browser',     type: AgentType.AGENT_TYPE_BROWSER },
        { mode: 'scraper',     type: AgentType.AGENT_TYPE_SCRAPER },
        { mode: 'form_filler', type: AgentType.AGENT_TYPE_FORM_FILLER },
      ];

      for (const { mode, type } of modes) {
        vi.mocked(client.runAgent).mockResolvedValue({
          requestId: 'req',
          success: true,
          text: '',
          error: '',
          toolResults: [],
          usage: undefined,
          durationMs: '0',
          outputJson: '',
        });

        await service.run('test', { mode });

        expect(client.runAgent).toHaveBeenCalledWith(
          expect.objectContaining({ agentType: type })
        );
      }
    });

    it('should pass maxTurns via options map', async () => {
      vi.mocked(client.runAgent).mockResolvedValue({
        requestId: 'req', success: true, text: '', error: '',
        toolResults: [], usage: undefined, durationMs: '0', outputJson: '',
      });

      await service.run('test', { maxTurns: 5 });

      expect(client.runAgent).toHaveBeenCalledWith(
        expect.objectContaining({ options: expect.objectContaining({ max_turns: '5' }) })
      );
    });

    it('should pass maxRetries via options map', async () => {
      vi.mocked(client.runAgent).mockResolvedValue({
        requestId: 'req', success: true, text: '', error: '',
        toolResults: [], usage: undefined, durationMs: '0', outputJson: '',
      });

      await service.run('test', { maxRetries: 3 });

      expect(client.runAgent).toHaveBeenCalledWith(
        expect.objectContaining({ options: expect.objectContaining({ max_retries: '3' }) })
      );
    });

    it('should pass model via options map', async () => {
      vi.mocked(client.runAgent).mockResolvedValue({
        requestId: 'req', success: true, text: '', error: '',
        toolResults: [], usage: undefined, durationMs: '0', outputJson: '',
      });

      await service.run('test', { model: 'claude-opus-4-6' });

      expect(client.runAgent).toHaveBeenCalledWith(
        expect.objectContaining({ options: expect.objectContaining({ model: 'claude-opus-4-6' }) })
      );
    });

    it('should merge maxTurns/maxRetries/model with user options', async () => {
      vi.mocked(client.runAgent).mockResolvedValue({
        requestId: 'req', success: true, text: '', error: '',
        toolResults: [], usage: undefined, durationMs: '0', outputJson: '',
      });

      await service.run('test', {
        maxTurns: 10,
        maxRetries: 2,
        model: 'claude-sonnet-4-6',
        options: { custom_key: 'custom_value' },
      });

      expect(client.runAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          options: {
            custom_key: 'custom_value',
            max_turns: '10',
            max_retries: '2',
            model: 'claude-sonnet-4-6',
          },
        })
      );
    });
  });

  describe('extract', () => {
    it('should extract and parse structured output', async () => {
      vi.mocked(client.runAgent).mockResolvedValue({
        requestId: 'req-extract',
        success: true,
        text: '',
        error: '',
        toolResults: [],
        usage: undefined,
        durationMs: '100',
        outputJson: '{"count": 42, "items": ["a", "b", "c"]}',
      });

      interface Result {
        count: number;
        items: string[];
      }

      const result = await service.extract<Result>(
        'Count items',
        '{"type": "object"}'
      );

      expect(result.count).toBe(42);
      expect(result.items).toEqual(['a', 'b', 'c']);
    });

    it('should throw when no structured output returned', async () => {
      vi.mocked(client.runAgent).mockResolvedValue({
        requestId: 'req-no-json',
        success: true,
        text: 'Plain text response',
        error: '',
        toolResults: [],
        usage: undefined,
        durationMs: '100',
        outputJson: '',
      });

      await expect(
        service.extract('Get data', '{"type": "object"}')
      ).rejects.toThrow('Agent did not return structured output');
    });

    it('should throw on invalid JSON', async () => {
      vi.mocked(client.runAgent).mockResolvedValue({
        requestId: 'req-bad-json',
        success: true,
        text: '',
        error: '',
        toolResults: [],
        usage: undefined,
        durationMs: '100',
        outputJson: 'not valid json',
      });

      await expect(
        service.extract('Get data', '{"type": "object"}')
      ).rejects.toThrow('Failed to parse agent output');
    });

    it('should pass options to run', async () => {
      vi.mocked(client.runAgent).mockResolvedValue({
        requestId: 'req',
        success: true,
        text: '',
        error: '',
        toolResults: [],
        usage: undefined,
        durationMs: '100',
        outputJson: '{}',
      });

      await service.extract('Query', '{}', {
        mode: 'planner',
        timeoutSeconds: 120,
      });

      expect(client.runAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          agentType: AgentType.AGENT_TYPE_PLANNER,
          timeoutSeconds: 120,
          outputSchema: '{}',
        })
      );
    });
  });
});
