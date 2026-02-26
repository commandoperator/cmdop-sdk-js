import { describe, it, expect } from 'vitest';
import { Status } from '@grpc/grpc-js/build/src/constants';
import {
  CMDOPError,
  ConnectionError,
  AuthenticationError,
  SessionError,
  TimeoutError,
  NotFoundError,
  PermissionError,
  CancelledError,
  // New Node.js-specific errors
  AgentNotRunningError,
  StalePortFileError,
  ConnectionLostError,
  InvalidAPIKeyError,
  TokenExpiredError,
  AgentError,
  AgentOfflineError,
  AgentBusyError,
  FeatureNotAvailableError,
  SessionInterruptedError,
  FileTooLargeError,
  BrowserError,
  BrowserSessionClosedError,
  BrowserNavigationError,
  BrowserElementNotFoundError,
  RateLimitError,
  mapGrpcError,
  withErrorMapping,
} from '../src/errors';

// ============================================================================
// Helpers
// ============================================================================

function makeGrpcError(code: number, message = 'grpc error', details?: string) {
  const err = new Error(message) as Error & { code: number; details?: string };
  err.code = code;
  if (details !== undefined) err.details = details;
  return err;
}

// ============================================================================
// Connection Errors
// ============================================================================

describe('AgentNotRunningError', () => {
  it('has correct name and inherits ConnectionError', () => {
    const err = new AgentNotRunningError();
    expect(err.name).toBe('AgentNotRunningError');
    expect(err).toBeInstanceOf(ConnectionError);
    expect(err).toBeInstanceOf(CMDOPError);
    expect(err.message).toContain('cmdop serve');
  });

  it('accepts custom message', () => {
    const err = new AgentNotRunningError('custom message');
    expect(err.message).toBe('custom message');
  });
});

describe('StalePortFileError', () => {
  it('has correct name and stores discoveryPath', () => {
    const err = new StalePortFileError('/tmp/cmdop.json');
    expect(err.name).toBe('StalePortFileError');
    expect(err.discoveryPath).toBe('/tmp/cmdop.json');
    expect(err).toBeInstanceOf(ConnectionError);
    expect(err.message).toContain('/tmp/cmdop.json');
  });

  it('cleanup() does not throw for non-existent path', () => {
    const err = new StalePortFileError('/nonexistent/path.json');
    expect(() => err.cleanup()).not.toThrow();
  });
});

describe('ConnectionLostError', () => {
  it('has correct name and default message', () => {
    const err = new ConnectionLostError();
    expect(err.name).toBe('ConnectionLostError');
    expect(err.message).toBe('Connection was lost');
    expect(err).toBeInstanceOf(ConnectionError);
  });

  it('accepts custom message', () => {
    const err = new ConnectionLostError('disconnected mid-stream');
    expect(err.message).toBe('disconnected mid-stream');
  });
});

// ============================================================================
// Auth Errors
// ============================================================================

describe('InvalidAPIKeyError', () => {
  it('has correct name and default message', () => {
    const err = new InvalidAPIKeyError();
    expect(err.name).toBe('InvalidAPIKeyError');
    expect(err.message).toBe('Invalid or expired API key');
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it('accepts custom message', () => {
    const err = new InvalidAPIKeyError('key revoked');
    expect(err.message).toBe('key revoked');
  });
});

describe('TokenExpiredError', () => {
  it('has correct name and default message', () => {
    const err = new TokenExpiredError();
    expect(err.name).toBe('TokenExpiredError');
    expect(err.message).toBe('Authentication token has expired');
    expect(err).toBeInstanceOf(AuthenticationError);
  });
});

// ============================================================================
// Agent Errors
// ============================================================================

describe('AgentError', () => {
  it('has correct name and default code', () => {
    const err = new AgentError('something went wrong');
    expect(err.name).toBe('AgentError');
    expect(err.code).toBe('AGENT_ERROR');
    expect(err).toBeInstanceOf(CMDOPError);
  });

  it('accepts custom code', () => {
    const err = new AgentError('msg', 'MY_CODE');
    expect(err.code).toBe('MY_CODE');
  });
});

describe('AgentOfflineError', () => {
  it('has correct name and message without agentId', () => {
    const err = new AgentOfflineError();
    expect(err.name).toBe('AgentOfflineError');
    expect(err.message).toBe('Agent is offline');
    expect(err.code).toBe('AGENT_OFFLINE');
    expect(err).toBeInstanceOf(AgentError);
  });

  it('includes agentId in message when provided', () => {
    const err = new AgentOfflineError('agent-123');
    expect(err.agentId).toBe('agent-123');
    expect(err.message).toBe('Agent agent-123 is offline');
  });
});

describe('AgentBusyError', () => {
  it('has correct name and default message', () => {
    const err = new AgentBusyError();
    expect(err.name).toBe('AgentBusyError');
    expect(err.message).toBe('Agent is busy');
    expect(err.code).toBe('AGENT_BUSY');
    expect(err).toBeInstanceOf(AgentError);
  });
});

describe('FeatureNotAvailableError', () => {
  it('has correct name and message', () => {
    const err = new FeatureNotAvailableError('browser', 'local');
    expect(err.name).toBe('FeatureNotAvailableError');
    expect(err.feature).toBe('browser');
    expect(err.mode).toBe('local');
    expect(err.message).toContain('browser');
    expect(err.message).toContain('local');
    expect(err.code).toBe('FEATURE_NOT_AVAILABLE');
    expect(err).toBeInstanceOf(AgentError);
  });
});

// ============================================================================
// Session Errors
// ============================================================================

describe('SessionInterruptedError', () => {
  it('has correct name and default message containing sessionId', () => {
    const err = new SessionInterruptedError('sess-abc');
    expect(err.name).toBe('SessionInterruptedError');
    expect(err).toBeInstanceOf(SessionError);
    expect(err.message).toContain('sess-abc');
  });

  it('accepts custom message', () => {
    const err = new SessionInterruptedError('sess-abc', 'network dropped');
    expect(err.message).toBe('network dropped');
  });
});

// ============================================================================
// File Errors
// ============================================================================

describe('FileTooLargeError', () => {
  it('has correct name and fields', () => {
    const err = new FileTooLargeError('/tmp/big.bin', 100 * 1024 * 1024, 10 * 1024 * 1024);
    expect(err.name).toBe('FileTooLargeError');
    expect(err.path).toBe('/tmp/big.bin');
    expect(err.sizeBytes).toBe(100 * 1024 * 1024);
    expect(err.maxBytes).toBe(10 * 1024 * 1024);
    expect(err.code).toBe('FILE_TOO_LARGE');
    expect(err).toBeInstanceOf(CMDOPError);
    expect(err.message).toContain('/tmp/big.bin');
  });
});

// ============================================================================
// Browser Errors
// ============================================================================

describe('BrowserError', () => {
  it('has correct name and default code', () => {
    const err = new BrowserError('something failed');
    expect(err.name).toBe('BrowserError');
    expect(err.code).toBe('BROWSER_ERROR');
    expect(err).toBeInstanceOf(CMDOPError);
  });
});

describe('BrowserSessionClosedError', () => {
  it('has correct name and helpful message', () => {
    const err = new BrowserSessionClosedError();
    expect(err.name).toBe('BrowserSessionClosedError');
    expect(err.code).toBe('BROWSER_SESSION_CLOSED');
    expect(err.message).toContain('CMDOP Desktop');
    expect(err).toBeInstanceOf(BrowserError);
  });

  it('appends errorDetail when provided', () => {
    const err = new BrowserSessionClosedError('target closed');
    expect(err.message).toContain('target closed');
  });
});

describe('BrowserNavigationError', () => {
  it('has correct name and url', () => {
    const err = new BrowserNavigationError('https://example.com');
    expect(err.name).toBe('BrowserNavigationError');
    expect(err.url).toBe('https://example.com');
    expect(err.code).toBe('BROWSER_NAVIGATION_ERROR');
    expect(err.message).toContain('https://example.com');
    expect(err).toBeInstanceOf(BrowserError);
  });

  it('includes timeout hint when errorDetail contains timeout', () => {
    const err = new BrowserNavigationError('https://slow.com', 'Timeout exceeded');
    expect(err.message).toContain('timeout');
  });

  it('includes session closed hint when errorDetail contains target closed', () => {
    const err = new BrowserNavigationError('https://x.com', 'Target closed');
    expect(err.message).toContain('Restart');
  });

  it('includes raw details for other errors', () => {
    const err = new BrowserNavigationError('https://x.com', 'DNS resolution failed');
    expect(err.message).toContain('DNS resolution failed');
  });
});

describe('BrowserElementNotFoundError', () => {
  it('has correct name and selector', () => {
    const err = new BrowserElementNotFoundError('#submit-btn');
    expect(err.name).toBe('BrowserElementNotFoundError');
    expect(err.selector).toBe('#submit-btn');
    expect(err.operation).toBe('find');
    expect(err.code).toBe('BROWSER_ELEMENT_NOT_FOUND');
    expect(err.message).toContain('#submit-btn');
    expect(err).toBeInstanceOf(BrowserError);
  });

  it('accepts custom operation', () => {
    const err = new BrowserElementNotFoundError('.btn', 'click');
    expect(err.operation).toBe('click');
  });
});

// ============================================================================
// Rate Limiting
// ============================================================================

describe('RateLimitError', () => {
  it('has correct name without retryAfter', () => {
    const err = new RateLimitError();
    expect(err.name).toBe('RateLimitError');
    expect(err.code).toBe('RATE_LIMIT');
    expect(err.message).toBe('Rate limit exceeded');
    expect(err).toBeInstanceOf(CMDOPError);
  });

  it('includes retryAfterSeconds in message when provided', () => {
    const err = new RateLimitError(30);
    expect(err.retryAfterSeconds).toBe(30);
    expect(err.message).toBe('Rate limit exceeded, retry after 30s');
  });
});

// ============================================================================
// mapGrpcError
// ============================================================================

describe('mapGrpcError', () => {
  it('passes through existing CMDOPError', () => {
    const original = new CMDOPError('already mapped');
    const result = mapGrpcError(original);
    expect(result).toBe(original);
  });

  it('wraps plain Error', () => {
    const err = new Error('plain error');
    const result = mapGrpcError(err);
    expect(result).toBeInstanceOf(CMDOPError);
    expect(result.message).toBe('plain error');
  });

  it('wraps non-Error value', () => {
    const result = mapGrpcError('string error');
    expect(result).toBeInstanceOf(CMDOPError);
    expect(result.message).toBe('string error');
  });

  it('maps CANCELLED to CancelledError', () => {
    const result = mapGrpcError(makeGrpcError(Status.CANCELLED));
    expect(result).toBeInstanceOf(CancelledError);
  });

  it('maps DEADLINE_EXCEEDED to TimeoutError', () => {
    const result = mapGrpcError(makeGrpcError(Status.DEADLINE_EXCEEDED));
    expect(result).toBeInstanceOf(TimeoutError);
  });

  it('maps NOT_FOUND to NotFoundError', () => {
    const result = mapGrpcError(makeGrpcError(Status.NOT_FOUND));
    expect(result).toBeInstanceOf(NotFoundError);
  });

  it('maps PERMISSION_DENIED to PermissionError', () => {
    const result = mapGrpcError(makeGrpcError(Status.PERMISSION_DENIED));
    expect(result).toBeInstanceOf(PermissionError);
  });

  it('maps RESOURCE_EXHAUSTED to RateLimitError', () => {
    const result = mapGrpcError(makeGrpcError(Status.RESOURCE_EXHAUSTED));
    expect(result).toBeInstanceOf(RateLimitError);
  });

  it('maps UNAVAILABLE to AgentOfflineError', () => {
    const result = mapGrpcError(makeGrpcError(Status.UNAVAILABLE));
    expect(result).toBeInstanceOf(AgentOfflineError);
  });

  it('maps UNAUTHENTICATED to InvalidAPIKeyError', () => {
    const result = mapGrpcError(makeGrpcError(Status.UNAUTHENTICATED, 'bad key'));
    expect(result).toBeInstanceOf(InvalidAPIKeyError);
  });

  it('uses details field over message when present', () => {
    const result = mapGrpcError(makeGrpcError(Status.NOT_FOUND, 'msg', 'detailed info'));
    expect(result.message).toContain('detailed info');
  });

  it('includes operation in message via context', () => {
    const result = mapGrpcError(
      makeGrpcError(Status.NOT_FOUND, 'not found'),
      { operation: 'read' }
    );
    expect(result.message).toContain('[read]');
  });

  it('includes sessionId and path in message via context', () => {
    const result = mapGrpcError(
      makeGrpcError(Status.NOT_FOUND, 'not found'),
      { sessionId: 'sess-1', path: '/tmp/file.txt' }
    );
    expect(result.message).toContain('session=sess-1');
    expect(result.message).toContain('path=/tmp/file.txt');
  });

  it('sets resource on NotFoundError from context path', () => {
    const result = mapGrpcError(
      makeGrpcError(Status.NOT_FOUND, 'not found'),
      { path: '/tmp/missing.txt' }
    ) as NotFoundError;
    expect(result.resource).toBe('/tmp/missing.txt');
  });

  it('maps unknown code to CMDOPError with GRPC_ prefix', () => {
    const result = mapGrpcError(makeGrpcError(999));
    expect(result).toBeInstanceOf(CMDOPError);
    expect(result.code).toBe('GRPC_999');
  });
});

// ============================================================================
// withErrorMapping
// ============================================================================

describe('withErrorMapping', () => {
  it('returns value on success', async () => {
    const result = await withErrorMapping(() => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it('maps gRPC errors to SDK errors', async () => {
    const grpcErr = makeGrpcError(Status.UNAUTHENTICATED);
    await expect(
      withErrorMapping(() => Promise.reject(grpcErr))
    ).rejects.toBeInstanceOf(InvalidAPIKeyError);
  });

  it('maps UNAVAILABLE to AgentOfflineError', async () => {
    const grpcErr = makeGrpcError(Status.UNAVAILABLE);
    await expect(
      withErrorMapping(() => Promise.reject(grpcErr))
    ).rejects.toBeInstanceOf(AgentOfflineError);
  });

  it('passes context to mapGrpcError', async () => {
    const grpcErr = makeGrpcError(Status.NOT_FOUND, 'not found');
    await expect(
      withErrorMapping(() => Promise.reject(grpcErr), { operation: 'write' })
    ).rejects.toMatchObject({ message: expect.stringContaining('[write]') });
  });
});
