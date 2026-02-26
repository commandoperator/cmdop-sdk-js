import { describe, it, expect } from 'vitest';
import { CMDOPClient } from '../src/client';
import { BaseTransport, LocalTransport, RemoteTransport } from '../src/transport';

describe('CMDOPClient', () => {
  describe('mode getter', () => {
    it('should return "local" for a local client', () => {
      const client = CMDOPClient.local({ socketPath: '/tmp/test.sock' });
      expect(client.mode).toBe('local');
    });

    it('should return "remote" for a remote client', () => {
      const client = CMDOPClient.remote('cmdop_live_testkey');
      expect(client.mode).toBe('remote');
    });
  });

  describe('transport getter', () => {
    it('should return a BaseTransport instance for local client', () => {
      const client = CMDOPClient.local({ socketPath: '/tmp/test.sock' });
      expect(client.transport).toBeInstanceOf(BaseTransport);
    });

    it('should return a LocalTransport instance for local client', () => {
      const client = CMDOPClient.local({ socketPath: '/tmp/test.sock' });
      expect(client.transport).toBeInstanceOf(LocalTransport);
    });

    it('should return a RemoteTransport instance for remote client', () => {
      const client = CMDOPClient.remote('cmdop_live_testkey');
      expect(client.transport).toBeInstanceOf(RemoteTransport);
    });

    it('should expose the same address as the client address getter', () => {
      const client = CMDOPClient.remote('cmdop_live_testkey');
      expect(client.transport.address).toBe(client.address);
    });
  });

  describe('fromTransport static factory', () => {
    it('should create a client from RemoteTransport', () => {
      const transport = new RemoteTransport({ apiKey: 'cmdop_live_testkey' });
      const client = CMDOPClient.fromTransport(transport);
      expect(client).toBeInstanceOf(CMDOPClient);
    });

    it('should return "remote" mode when created from RemoteTransport', () => {
      const transport = new RemoteTransport({ apiKey: 'cmdop_live_testkey' });
      const client = CMDOPClient.fromTransport(transport);
      expect(client.mode).toBe('remote');
    });

    it('should expose the transport passed to fromTransport', () => {
      const transport = new RemoteTransport({ apiKey: 'cmdop_live_testkey', server: 'custom.host:443' });
      const client = CMDOPClient.fromTransport(transport);
      expect(client.transport).toBe(transport);
    });

    it('should preserve the transport address', () => {
      const transport = new RemoteTransport({ apiKey: 'cmdop_live_testkey', server: 'my.server:443' });
      const client = CMDOPClient.fromTransport(transport);
      expect(client.address).toBe('my.server:443');
    });
  });

  describe('isConnected getter', () => {
    it('should return false before connecting', () => {
      const client = CMDOPClient.remote('cmdop_live_testkey');
      expect(client.isConnected).toBe(false);
    });
  });

  describe('address getter', () => {
    it('should return the server address for remote clients', () => {
      const client = CMDOPClient.remote('cmdop_live_testkey', { server: 'grpc.example.com:443' });
      expect(client.address).toBe('grpc.example.com:443');
    });
  });
});
