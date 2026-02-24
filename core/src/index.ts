/**
 * @cmdop/core
 * Shared types, interfaces, and protocol definitions
 */

// ============================================================================
// Types
// ============================================================================

export type TransportMode = 'local' | 'remote';

export type SessionState = 'active' | 'closed' | 'error';

export interface SessionInfo {
  sessionId: string;
  state: SessionState;
  shell: string;
  cols: number;
  rows: number;
  workingDir?: string;
  createdAt: Date;
}

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: Date;
  permissions?: string;
}

export interface AgentEvent {
  type: 'token' | 'tool_call' | 'tool_result' | 'error' | 'done';
  payload: unknown;
  timestamp: Date;
}

// ============================================================================
// Configuration
// ============================================================================

export interface CMDOPConfig {
  apiKey?: string;
  agentId?: string;
  server?: string;
  timeout?: number;
}

export const DEFAULT_CONFIG = {
  server: 'grpc.cmdop.com:443',
  timeout: 30000,
} as const;

// ============================================================================
// Errors
// ============================================================================

export class CMDOPError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'CMDOPError';
  }
}

export class ConnectionError extends CMDOPError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONNECTION_ERROR', cause);
    this.name = 'ConnectionError';
  }
}

export class AuthenticationError extends CMDOPError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class SessionError extends CMDOPError {
  constructor(
    message: string,
    public readonly sessionId?: string
  ) {
    super(message, 'SESSION_ERROR');
    this.name = 'SessionError';
  }
}

export class TimeoutError extends CMDOPError {
  constructor(message = 'Operation timed out') {
    super(message, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
  }
}

export class NotFoundError extends CMDOPError {
  constructor(
    message: string,
    public readonly resource?: string
  ) {
    super(message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class PermissionError extends CMDOPError {
  constructor(message = 'Permission denied') {
    super(message, 'PERMISSION_DENIED');
    this.name = 'PermissionError';
  }
}

export class ResourceExhaustedError extends CMDOPError {
  constructor(message = 'Resource exhausted') {
    super(message, 'RESOURCE_EXHAUSTED');
    this.name = 'ResourceExhaustedError';
  }
}

export class CancelledError extends CMDOPError {
  constructor(message = 'Operation cancelled') {
    super(message, 'CANCELLED');
    this.name = 'CancelledError';
  }
}

export class UnavailableError extends CMDOPError {
  constructor(message = 'Service unavailable') {
    super(message, 'UNAVAILABLE');
    this.name = 'UnavailableError';
  }
}

// ============================================================================
// Version
// ============================================================================

export const VERSION = '0.1.0';

// ============================================================================
// API Clients (HTTP/REST)
// ============================================================================

// Pre-configured clients for https://api.cmdop.com
export { api, machines, workspaces, system, API_BASE_URL } from './api';

// Generated modules for custom configuration
export { MachinesModule, WorkspacesModule, SystemModule } from './api';
