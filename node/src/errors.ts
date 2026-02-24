/**
 * gRPC error mapping utilities
 *
 * Maps gRPC status codes and errors to SDK error types.
 */

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
      return new ResourceExhaustedError(message);

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
      return new UnavailableError(message);

    case Status.DATA_LOSS:
      return new CMDOPError(message, 'DATA_LOSS', error);

    case Status.UNAUTHENTICATED:
      return new AuthenticationError(message);

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
