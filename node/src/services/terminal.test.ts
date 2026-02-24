import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TerminalService } from './terminal';
import type { TerminalStreamingServiceClient } from '../generated/service';

// Create mock client
function createMockClient(): TerminalStreamingServiceClient {
  return {
    createSession: vi.fn(),
    closeSession: vi.fn(),
    sendInput: vi.fn(),
    sendResize: vi.fn(),
    sendSignal: vi.fn(),
    listSessions: vi.fn(),
    getSessionStatus: vi.fn(),
    getHistory: vi.fn(),
  } as unknown as TerminalStreamingServiceClient;
}

describe('TerminalService', () => {
  let client: TerminalStreamingServiceClient;
  let service: TerminalService;

  beforeEach(() => {
    client = createMockClient();
    service = new TerminalService(client);
  });

  describe('create', () => {
    it('should create session with default options', async () => {
      vi.mocked(client.createSession).mockResolvedValue({
        success: true,
        error: '',
        sessionId: 'sess-123',
      });

      const result = await service.create();

      expect(client.createSession).toHaveBeenCalledWith({
        userId: '',
        name: '',
        config: {
          sessionId: '',
          shell: '',
          workingDirectory: '',
          env: {},
          size: {
            cols: 80,
            rows: 24,
            width: 0,
            height: 0,
          },
        },
      });
      expect(result.sessionId).toBe('sess-123');
      expect(result.status).toBe('connected');
    });

    it('should create session with custom options', async () => {
      vi.mocked(client.createSession).mockResolvedValue({
        success: true,
        error: '',
        sessionId: 'sess-456',
      });

      const result = await service.create({
        name: 'my-session',
        cols: 120,
        rows: 40,
        shell: '/bin/zsh',
        workingDir: '/tmp',
        env: { TERM: 'xterm-256color' },
      });

      expect(client.createSession).toHaveBeenCalledWith({
        userId: '',
        name: 'my-session',
        config: {
          sessionId: '',
          shell: '/bin/zsh',
          workingDirectory: '/tmp',
          env: { TERM: 'xterm-256color' },
          size: {
            cols: 120,
            rows: 40,
            width: 0,
            height: 0,
          },
        },
      });
      expect(result.sessionId).toBe('sess-456');
    });

    it('should throw on failure', async () => {
      vi.mocked(client.createSession).mockResolvedValue({
        success: false,
        error: 'No shells available',
        sessionId: '',
      });

      await expect(service.create()).rejects.toThrow('No shells available');
    });
  });

  describe('close', () => {
    it('should close session', async () => {
      vi.mocked(client.closeSession).mockResolvedValue({
        success: true,
        error: '',
      });

      await service.close('sess-123');

      expect(client.closeSession).toHaveBeenCalledWith({
        sessionId: 'sess-123',
        reason: '',
        force: false,
      });
    });

    it('should close session with options', async () => {
      vi.mocked(client.closeSession).mockResolvedValue({
        success: true,
        error: '',
      });

      await service.close('sess-123', { reason: 'user request', force: true });

      expect(client.closeSession).toHaveBeenCalledWith({
        sessionId: 'sess-123',
        reason: 'user request',
        force: true,
      });
    });

    it('should throw on failure', async () => {
      vi.mocked(client.closeSession).mockResolvedValue({
        success: false,
        error: 'Session not found',
      });

      await expect(service.close('invalid')).rejects.toThrow('Session not found');
    });
  });

  describe('sendInput', () => {
    it('should send string input to session', async () => {
      vi.mocked(client.sendInput).mockResolvedValue({
        success: true,
        error: '',
      });

      await service.sendInput('sess-123', 'ls -la\n');

      expect(client.sendInput).toHaveBeenCalledWith({
        sessionId: 'sess-123',
        data: expect.any(Buffer),
      });
    });

    it('should send Uint8Array input', async () => {
      vi.mocked(client.sendInput).mockResolvedValue({
        success: true,
        error: '',
      });

      const data = new Uint8Array([0x1b, 0x5b, 0x41]); // Up arrow
      await service.sendInput('sess-123', data);

      expect(client.sendInput).toHaveBeenCalled();
    });

    it('should throw on failure', async () => {
      vi.mocked(client.sendInput).mockResolvedValue({
        success: false,
        error: 'Session disconnected',
      });

      await expect(service.sendInput('sess-123', 'test')).rejects.toThrow('Session disconnected');
    });
  });

  describe('resize', () => {
    it('should resize terminal', async () => {
      vi.mocked(client.sendResize).mockResolvedValue({
        success: true,
        error: '',
      });

      await service.resize('sess-123', 200, 50);

      expect(client.sendResize).toHaveBeenCalledWith({
        sessionId: 'sess-123',
        cols: 200,
        rows: 50,
      });
    });

    it('should throw on failure', async () => {
      vi.mocked(client.sendResize).mockResolvedValue({
        success: false,
        error: 'Invalid size',
      });

      await expect(service.resize('sess-123', 0, 0)).rejects.toThrow('Invalid size');
    });
  });

  describe('signal', () => {
    it('should send SIGINT signal', async () => {
      vi.mocked(client.sendSignal).mockResolvedValue({
        success: true,
        error: '',
      });

      await service.signal('sess-123', 'SIGINT');

      expect(client.sendSignal).toHaveBeenCalledWith({
        sessionId: 'sess-123',
        signal: 2,
      });
    });

    it('should send SIGTERM signal', async () => {
      vi.mocked(client.sendSignal).mockResolvedValue({
        success: true,
        error: '',
      });

      await service.signal('sess-123', 'SIGTERM');

      expect(client.sendSignal).toHaveBeenCalledWith({
        sessionId: 'sess-123',
        signal: 15,
      });
    });

    it('should send numeric signal', async () => {
      vi.mocked(client.sendSignal).mockResolvedValue({
        success: true,
        error: '',
      });

      await service.signal('sess-123', 9);

      expect(client.sendSignal).toHaveBeenCalledWith({
        sessionId: 'sess-123',
        signal: 9,
      });
    });
  });

  describe('list', () => {
    it('should list sessions', async () => {
      vi.mocked(client.listSessions).mockResolvedValue({
        error: '',
        sessions: [
          {
            sessionId: 'sess-1',
            machineHostname: 'host1',
            machineName: 'Machine 1',
            status: 'connected',
            os: 'darwin',
            agentVersion: '1.0.0',
            hasShell: true,
            shell: '/bin/bash',
            workingDirectory: '/home/user',
            connectedAt: new Date('2024-01-01'),
          },
        ],
        total: 1,
        workspaceName: 'default',
      });

      const result = await service.list();

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].sessionId).toBe('sess-1');
      expect(result.sessions[0].hostname).toBe('host1');
      expect(result.sessions[0].status).toBe('connected');
      expect(result.total).toBe(1);
    });

    it('should pass filter options', async () => {
      vi.mocked(client.listSessions).mockResolvedValue({
        error: '',
        sessions: [],
        total: 0,
        workspaceName: 'default',
      });

      await service.list({
        hostname: 'myhost',
        status: 'disconnected',
        limit: 50,
        offset: 10,
      });

      expect(client.listSessions).toHaveBeenCalledWith({
        hostnameFilter: 'myhost',
        statusFilter: 'disconnected',
        limit: 50,
        offset: 10,
      });
    });
  });

  describe('getStatus', () => {
    it('should get session status', async () => {
      vi.mocked(client.getSessionStatus).mockResolvedValue({
        exists: true,
        status: 1, // SESSION_ACTIVE
        agentHostname: 'host1',
        connectedAt: new Date('2024-01-01'),
        lastHeartbeatAt: new Date('2024-01-02'),
        commandsCount: 10,
      });

      const result = await service.getStatus('sess-123');

      expect(result.exists).toBe(true);
      expect(result.hostname).toBe('host1');
      expect(result.commandsCount).toBe(10);
    });
  });

  describe('getHistory', () => {
    it('should get session history', async () => {
      vi.mocked(client.getHistory).mockResolvedValue({
        commands: ['ls', 'pwd', 'cd /tmp'],
        total: 3,
      });

      const result = await service.getHistory('sess-123');

      expect(result.commands).toEqual(['ls', 'pwd', 'cd /tmp']);
      expect(result.total).toBe(3);
    });

    it('should pass limit and offset options', async () => {
      vi.mocked(client.getHistory).mockResolvedValue({
        commands: [],
        total: 0,
      });

      await service.getHistory('sess-123', { limit: 50, offset: 10 });

      expect(client.getHistory).toHaveBeenCalledWith({
        sessionId: 'sess-123',
        limit: 50,
        offset: 10,
      });
    });
  });
});
