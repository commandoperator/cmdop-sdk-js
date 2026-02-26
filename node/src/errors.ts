/**
 * gRPC error mapping utilities + extended error hierarchy
 *
 * Maps gRPC status codes to SDK error types.
 * Also defines Node.js SDK-specific error subclasses.
 */

import { Status } from '@grpc/grpc-js/build/src/constants';
import {
  CMDOPError,
  ConnectionError,
  AuthenticationError,
  SessionError,
  TimeoutError,
  NotFoundError,
  PermissionError,
  ResourceExhaustedError,
  CancelledError,
  UnavailableError,
} from '@cmdop/core';

// Re-export base classes for convenience
export {
  CMDOPError,
  ConnectionError,
  AuthenticationError,
  SessionError,
  TimeoutError,
  NotFoundError,
  PermissionError,
  ResourceExhaustedError,
  CancelledError,
  UnavailableError,
} from '@cmdop/core';

// ============================================================================
// Connection Errors
// ============================================================================

/**
 * Local agent is not running or not discoverable.
 */
export class AgentNotRunningError extends ConnectionError {
  constructor(message?: string) {
    super(
      message ??
        'CMDOP agent is not running.\n\n' +
        'To fix, run one of:\n' +
        '  • cmdop serve          # Start local server\n' +
        '  • Open CMDOP Desktop   # Starts server automatically\n'
    );
    this.name = 'AgentNotRunningError';
  }
}

/**
 * Discovery file exists but agent is unreachable (likely crashed).
 */
export class StalePortFileError extends ConnectionError {
  constructor(public readonly discoveryPath: string) {
    super(`Stale discovery file at ${discoveryPath}`);
    this.name = 'StalePortFileError';
  }

  /** Remove the stale discovery file. */
  cleanup(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('fs').unlinkSync(this.discoveryPath);
    } catch {
      // ignore
    }
  }
}

/**
 * Connection was lost during an operation.
 */
export class ConnectionLostError extends ConnectionError {
  constructor(message = 'Connection was lost') {
    super(message);
    this.name = 'ConnectionLostError';
  }
}

// ============================================================================
// Authentication Errors
// ============================================================================

/**
 * API key is invalid or expired.
 */
export class InvalidAPIKeyError extends AuthenticationError {
  constructor(message = 'Invalid or expired API key') {
    super(message);
    this.name = 'InvalidAPIKeyError';
  }
}

/**
 * Authentication token has expired.
 */
export class TokenExpiredError extends AuthenticationError {
  constructor(message = 'Authentication token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

// ============================================================================
// Agent Errors
// ============================================================================

/**
 * Base for agent-related errors.
 */
export class AgentError extends CMDOPError {
  constructor(message: string, code?: string) {
    super(message, code ?? 'AGENT_ERROR');
    this.name = 'AgentError';
  }
}

/**
 * Target agent is not connected to cloud relay.
 */
export class AgentOfflineError extends AgentError {
  constructor(public readonly agentId?: string) {
    const msg = agentId ? `Agent ${agentId} is offline` : 'Agent is offline';
    super(msg, 'AGENT_OFFLINE');
    this.name = 'AgentOfflineError';
  }
}

/**
 * Agent is busy and cannot accept new requests.
 */
export class AgentBusyError extends AgentError {
  constructor(message = 'Agent is busy') {
    super(message, 'AGENT_BUSY');
    this.name = 'AgentBusyError';
  }
}

/**
 * Requested feature is not available in the current mode.
 */
export class FeatureNotAvailableError extends AgentError {
  constructor(
    public readonly feature: string,
    public readonly mode: string
  ) {
    super(`Feature '${feature}' is not available in ${mode} mode`, 'FEATURE_NOT_AVAILABLE');
    this.name = 'FeatureNotAvailableError';
  }
}

// ============================================================================
// Session Errors
// ============================================================================

/**
 * Session was interrupted (connection lost mid-operation).
 */
export class SessionInterruptedError extends SessionError {
  constructor(sessionId: string, message?: string) {
    super(message ?? `Session interrupted: ${sessionId}`, sessionId);
    this.name = 'SessionInterruptedError';
  }
}

// ============================================================================
// File Errors
// ============================================================================

/**
 * File exceeds the allowed size limit.
 */
export class FileTooLargeError extends CMDOPError {
  constructor(
    public readonly path: string,
    public readonly sizeBytes: number,
    public readonly maxBytes: number
  ) {
    super(
      `File too large: ${path} (${sizeBytes} bytes, max ${maxBytes})`,
      'FILE_TOO_LARGE'
    );
    this.name = 'FileTooLargeError';
  }
}

// ============================================================================
// Browser Errors
// ============================================================================

/**
 * Base for browser automation errors.
 */
export class BrowserError extends CMDOPError {
  constructor(message: string, code?: string) {
    super(message, code ?? 'BROWSER_ERROR');
    this.name = 'BrowserError';
  }
}

/**
 * Browser session or page was closed unexpectedly.
 */
export class BrowserSessionClosedError extends BrowserError {
  constructor(errorDetail?: string) {
    let message =
      'Browser session was closed unexpectedly.\n\n' +
      'Possible causes:\n' +
      '  • Browser process crashed\n' +
      '  • CMDOP Desktop was restarted\n' +
      '  • Page navigation caused session to close\n\n' +
      'To fix:\n' +
      '  • Restart CMDOP Desktop or run: cmdop serve\n' +
      '  • Create a new browser session\n';
    if (errorDetail) message += `\nDetails: ${errorDetail}`;
    super(message, 'BROWSER_SESSION_CLOSED');
    this.name = 'BrowserSessionClosedError';
  }
}

/**
 * Navigation to URL failed.
 */
export class BrowserNavigationError extends BrowserError {
  constructor(
    public readonly url: string,
    errorDetail?: string
  ) {
    let message = `Failed to navigate to: ${url}`;
    if (errorDetail) {
      if (errorDetail.toLowerCase().includes('target closed')) {
        message += '\n\nBrowser session was closed. Restart CMDOP Desktop or cmdop serve.';
      } else if (errorDetail.toLowerCase().includes('timeout')) {
        message += '\n\nPage took too long to load. Try increasing timeout.';
      } else {
        message += `\n\nDetails: ${errorDetail}`;
      }
    }
    super(message, 'BROWSER_NAVIGATION_ERROR');
    this.name = 'BrowserNavigationError';
  }
}

/**
 * Element not found by CSS selector.
 */
export class BrowserElementNotFoundError extends BrowserError {
  constructor(
    public readonly selector: string,
    public readonly operation: string = 'find'
  ) {
    super(
      `Element not found: ${selector}\n\n` +
      'Tips:\n' +
      '  • Check selector syntax (CSS selector)\n' +
      '  • Element may not be loaded yet — use wait()\n' +
      '  • Use browser DevTools to verify selector\n',
      'BROWSER_ELEMENT_NOT_FOUND'
    );
    this.name = 'BrowserElementNotFoundError';
  }
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Rate limit exceeded.
 */
export class RateLimitError extends CMDOPError {
  constructor(public readonly retryAfterSeconds?: number) {
    let msg = 'Rate limit exceeded';
    if (retryAfterSeconds !== undefined) msg += `, retry after ${retryAfterSeconds}s`;
    super(msg, 'RATE_LIMIT');
    this.name = 'RateLimitError';
  }
}

/**
 * Error context for enriched error messages
 */
export interface ErrorContext {
  sessionId?: string;
  path?: string;
  operation?: string;
}

/**
 * Check if an error is a gRPC error with a status code
 */
function isGrpcError(error: unknown): error is Error & { code: number; details?: string } {
  return error instanceof Error && typeof (error as any).code === 'number';
}

/**
 * Map a gRPC error to the appropriate SDK error type
 *
 * @param error - The error from gRPC call
 * @param context - Optional context to enrich error message
 * @returns Mapped SDK error
 *
 * @example
 * ```typescript
 * try {
 *   await client.fileRead({ sessionId, path });
 * } catch (error) {
 *   throw mapGrpcError(error, { sessionId, path, operation: 'read' });
 * }
 * ```
 */
export function mapGrpcError(error: unknown, context?: ErrorContext): CMDOPError {
  if (!isGrpcError(error)) {
    if (error instanceof CMDOPError) {
      return error;
    }
    if (error instanceof Error) {
      return new CMDOPError(error.message, undefined, error);
    }
    return new CMDOPError(String(error));
  }

  const message = formatErrorMessage(error.details || error.message, context);

  switch (error.code) {
    case Status.CANCELLED:
      return new CancelledError(message);

    case Status.UNKNOWN:
      return new CMDOPError(message, 'UNKNOWN', error);

    case Status.INVALID_ARGUMENT:
      return new CMDOPError(message, 'INVALID_ARGUMENT', error);

    case Status.DEADLINE_EXCEEDED:
      return new TimeoutError(message);

    case Status.NOT_FOUND:
      return new NotFoundError(message, context?.path || context?.sessionId);

    case Status.ALREADY_EXISTS:
      return new CMDOPError(message, 'ALREADY_EXISTS', error);

    case Status.PERMISSION_DENIED:
      return new PermissionError(message);

    case Status.RESOURCE_EXHAUSTED:
      return new RateLimitError();

    case Status.FAILED_PRECONDITION:
      return new CMDOPError(message, 'FAILED_PRECONDITION', error);

    case Status.ABORTED:
      return new CMDOPError(message, 'ABORTED', error);

    case Status.OUT_OF_RANGE:
      return new CMDOPError(message, 'OUT_OF_RANGE', error);

    case Status.UNIMPLEMENTED:
      return new CMDOPError(message, 'UNIMPLEMENTED', error);

    case Status.INTERNAL:
      return new CMDOPError(message, 'INTERNAL', error);

    case Status.UNAVAILABLE:
      return new AgentOfflineError();

    case Status.DATA_LOSS:
      return new CMDOPError(message, 'DATA_LOSS', error);

    case Status.UNAUTHENTICATED:
      return new InvalidAPIKeyError(message);

    default:
      return new CMDOPError(message, `GRPC_${error.code}`, error);
  }
}

/**
 * Format error message with context
 */
function formatErrorMessage(baseMessage: string, context?: ErrorContext): string {
  if (!context) {
    return baseMessage;
  }

  const parts: string[] = [baseMessage];

  if (context.operation) {
    parts.unshift(`[${context.operation}]`);
  }

  const details: string[] = [];
  if (context.sessionId) {
    details.push(`session=${context.sessionId}`);
  }
  if (context.path) {
    details.push(`path=${context.path}`);
  }

  if (details.length > 0) {
    parts.push(`(${details.join(', ')})`);
  }

  return parts.join(' ');
}

/**
 * Wrap an async function to automatically map gRPC errors
 *
 * @param fn - Async function to wrap
 * @param context - Error context to use
 * @returns Wrapped function that maps errors
 *
 * @example
 * ```typescript
 * const read = withErrorMapping(
 *   () => client.fileRead({ sessionId, path }),
 *   { sessionId, path, operation: 'read' }
 * );
 * const result = await read();
 * ```
 */
export async function withErrorMapping<T>(
  fn: () => Promise<T>,
  context?: ErrorContext
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw mapGrpcError(error, context);
  }
}
