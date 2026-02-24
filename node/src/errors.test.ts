import { describe, it, expect } from 'vitest';
import { Status } from '@grpc/grpc-js/build/src/constants';
import {
  CMDOPError,
  ConnectionError,
  AuthenticationError,
  TimeoutError,
  NotFoundError,
  PermissionError,
  ResourceExhaustedError,
  CancelledError,
  UnavailableError,
} from '@cmdop/core';
import { mapGrpcError, withErrorMapping } from './errors';

describe('mapGrpcError', () => {
  it('should return CMDOPError for non-gRPC errors', () => {
    const error = new Error('Regular error');
    const result = mapGrpcError(error);

    expect(result).toBeInstanceOf(CMDOPError);
    expect(result.message).toBe('Regular error');
  });

  it('should pass through existing CMDOPError', () => {
    const error = new CMDOPError('Already mapped');
    const result = mapGrpcError(error);

    expect(result).toBe(error);
  });

  it('should handle string errors', () => {
    const result = mapGrpcError('String error');

    expect(result).toBeInstanceOf(CMDOPError);
    expect(result.message).toBe('String error');
  });

  describe('gRPC status codes', () => {
    it('should map CANCELLED to CancelledError', () => {
      const error = Object.assign(new Error('Cancelled'), { code: Status.CANCELLED });
      const result = mapGrpcError(error);

      expect(result).toBeInstanceOf(CancelledError);
    });

    it('should map DEADLINE_EXCEEDED to TimeoutError', () => {
      const error = Object.assign(new Error('Timeout'), { code: Status.DEADLINE_EXCEEDED });
      const result = mapGrpcError(error);

      expect(result).toBeInstanceOf(TimeoutError);
    });

    it('should map NOT_FOUND to NotFoundError', () => {
      const error = Object.assign(new Error('Not found'), { code: Status.NOT_FOUND });
      const result = mapGrpcError(error);

      expect(result).toBeInstanceOf(NotFoundError);
    });

    it('should map PERMISSION_DENIED to PermissionError', () => {
      const error = Object.assign(new Error('Denied'), { code: Status.PERMISSION_DENIED });
      const result = mapGrpcError(error);

      expect(result).toBeInstanceOf(PermissionError);
    });

    it('should map RESOURCE_EXHAUSTED to ResourceExhaustedError', () => {
      const error = Object.assign(new Error('Exhausted'), { code: Status.RESOURCE_EXHAUSTED });
      const result = mapGrpcError(error);

      expect(result).toBeInstanceOf(ResourceExhaustedError);
    });

    it('should map UNAVAILABLE to UnavailableError', () => {
      const error = Object.assign(new Error('Unavailable'), { code: Status.UNAVAILABLE });
      const result = mapGrpcError(error);

      expect(result).toBeInstanceOf(UnavailableError);
    });

    it('should map UNAUTHENTICATED to AuthenticationError', () => {
      const error = Object.assign(new Error('Unauthenticated'), { code: Status.UNAUTHENTICATED });
      const result = mapGrpcError(error);

      expect(result).toBeInstanceOf(AuthenticationError);
    });

    it('should use details field when available', () => {
      const error = Object.assign(new Error('Generic'), {
        code: Status.NOT_FOUND,
        details: 'Session not found',
      });
      const result = mapGrpcError(error);

      expect(result.message).toBe('Session not found');
    });
  });

  describe('error context', () => {
    it('should include operation in message', () => {
      const error = Object.assign(new Error('Failed'), { code: Status.NOT_FOUND });
      const result = mapGrpcError(error, { operation: 'read' });

      expect(result.message).toContain('[read]');
    });

    it('should include sessionId in message', () => {
      const error = Object.assign(new Error('Failed'), { code: Status.NOT_FOUND });
      const result = mapGrpcError(error, { sessionId: 'sess-123' });

      expect(result.message).toContain('session=sess-123');
    });

    it('should include path in message', () => {
      const error = Object.assign(new Error('Failed'), { code: Status.NOT_FOUND });
      const result = mapGrpcError(error, { path: '/tmp/file.txt' });

      expect(result.message).toContain('path=/tmp/file.txt');
    });

    it('should include all context fields', () => {
      const error = Object.assign(new Error('Failed'), { code: Status.NOT_FOUND });
      const result = mapGrpcError(error, {
        operation: 'read',
        sessionId: 'sess-123',
        path: '/tmp/file.txt',
      });

      expect(result.message).toContain('[read]');
      expect(result.message).toContain('session=sess-123');
      expect(result.message).toContain('path=/tmp/file.txt');
    });

    it('should set resource on NotFoundError', () => {
      const error = Object.assign(new Error('Not found'), { code: Status.NOT_FOUND });
      const result = mapGrpcError(error, { path: '/tmp/missing.txt' }) as NotFoundError;

      expect(result.resource).toBe('/tmp/missing.txt');
    });
  });
});

describe('withErrorMapping', () => {
  it('should return result on success', async () => {
    const result = await withErrorMapping(async () => 'success');

    expect(result).toBe('success');
  });

  it('should map errors on failure', async () => {
    const error = Object.assign(new Error('Timeout'), { code: Status.DEADLINE_EXCEEDED });

    await expect(
      withErrorMapping(async () => {
        throw error;
      })
    ).rejects.toBeInstanceOf(TimeoutError);
  });

  it('should include context in error', async () => {
    const error = Object.assign(new Error('Not found'), { code: Status.NOT_FOUND });

    try {
      await withErrorMapping(
        async () => {
          throw error;
        },
        { operation: 'read', path: '/tmp/file.txt' }
      );
    } catch (e) {
      expect((e as Error).message).toContain('[read]');
      expect((e as Error).message).toContain('path=/tmp/file.txt');
    }
  });
});
