/**
 * Error mapping utilities
 * Maps WebSocket/RPC errors to @cmdop/core error types
 */

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

/**
 * RPC error response shape from Centrifugo
 */
interface RPCErrorResponse {
  code?: number;
  message?: string;
  data?: {
    error_code?: string;
    session_id?: string;
    resource?: string;
  };
}

/**
 * Error codes from Django RPC handlers
 */
const ERROR_CODES = {
  // Authentication/Authorization
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,

  // Resource errors
  NOT_FOUND: 404,
  CONFLICT: 409,

  // Rate limiting
  TOO_MANY_REQUESTS: 429,

  // Server errors
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,

  // Custom error codes from handlers
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_CLOSED: 'SESSION_CLOSED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  TIMEOUT: 'TIMEOUT',
  CANCELLED: 'CANCELLED',
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED',
} as const;

/**
 * Map an RPC error to appropriate CMDOP error type
 */
export function mapRPCError(error: unknown): Error {
  // Already a CMDOP error
  if (error instanceof CMDOPError) {
    return error;
  }

  // Regular Error
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Connection errors
    if (
      message.includes('not connected') ||
      message.includes('connection') ||
      message.includes('websocket') ||
      message.includes('network')
    ) {
      return new ConnectionError(error.message, error);
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return new TimeoutError(error.message);
    }

    // Authentication errors
    if (
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      message.includes('auth')
    ) {
      return new AuthenticationError(error.message);
    }

    // Permission errors
    if (message.includes('permission') || message.includes('forbidden') || message.includes('access denied')) {
      return new PermissionError(error.message);
    }

    // Not found errors
    if (message.includes('not found') || message.includes('does not exist')) {
      return new NotFoundError(error.message);
    }

    // Cancelled errors
    if (message.includes('cancelled') || message.includes('canceled') || message.includes('aborted')) {
      return new CancelledError(error.message);
    }

    return new CMDOPError(error.message, undefined, error);
  }

  // RPC error response object
  if (isRPCErrorResponse(error)) {
    return mapRPCErrorResponse(error);
  }

  // Unknown error type
  return new CMDOPError(String(error));
}

/**
 * Type guard for RPC error response
 */
function isRPCErrorResponse(error: unknown): error is RPCErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || 'message' in error)
  );
}

/**
 * Map RPC error response to CMDOP error
 */
function mapRPCErrorResponse(error: RPCErrorResponse): Error {
  const message = error.message || 'Unknown error';
  const code = error.code;
  const errorCode = error.data?.error_code;

  // Map by HTTP-like status code
  if (code) {
    switch (code) {
      case ERROR_CODES.UNAUTHORIZED:
        return new AuthenticationError(message);

      case ERROR_CODES.FORBIDDEN:
        return new PermissionError(message);

      case ERROR_CODES.NOT_FOUND:
        return new NotFoundError(message, error.data?.resource);

      case ERROR_CODES.TOO_MANY_REQUESTS:
        return new ResourceExhaustedError(message);

      case ERROR_CODES.SERVICE_UNAVAILABLE:
        return new UnavailableError(message);
    }
  }

  // Map by custom error code
  if (errorCode) {
    switch (errorCode) {
      case ERROR_CODES.SESSION_NOT_FOUND:
      case ERROR_CODES.SESSION_CLOSED:
        return new SessionError(message, error.data?.session_id);

      case ERROR_CODES.PERMISSION_DENIED:
        return new PermissionError(message);

      case ERROR_CODES.TIMEOUT:
        return new TimeoutError(message);

      case ERROR_CODES.CANCELLED:
        return new CancelledError(message);

      case ERROR_CODES.RESOURCE_EXHAUSTED:
        return new ResourceExhaustedError(message);
    }
  }

  return new CMDOPError(message, errorCode || String(code));
}

/**
 * Create error from RPC result with success=false
 */
export function createErrorFromResult(result: { success: false; error?: string; error_code?: string }): Error {
  const message = result.error || 'Operation failed';
  const code = result.error_code;

  if (code) {
    switch (code) {
      case 'SESSION_NOT_FOUND':
      case 'SESSION_CLOSED':
        return new SessionError(message);
      case 'PERMISSION_DENIED':
        return new PermissionError(message);
      case 'NOT_FOUND':
        return new NotFoundError(message);
      case 'TIMEOUT':
        return new TimeoutError(message);
    }
  }

  return new CMDOPError(message, code);
}

/**
 * Check if error is a connection error that should trigger reconnect
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ConnectionError || error instanceof UnavailableError) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('connection') ||
      message.includes('network') ||
      message.includes('unavailable') ||
      message.includes('websocket')
    );
  }

  return false;
}
