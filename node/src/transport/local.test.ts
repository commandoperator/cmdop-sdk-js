import { describe, it, expect } from 'vitest';
import { LocalTransport } from './local';

describe('LocalTransport', () => {
  describe('static discover', () => {
    it('should be a static method', () => {
      expect(typeof LocalTransport.discover).toBe('function');
    });
  });

  // Integration tests (require running agent):
  // - Connection via Unix socket
  // - Connection via Named Pipe (Windows)
  // - Discovery via agent.info file
  // - Token authentication
});
