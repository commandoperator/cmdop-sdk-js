/**
 * @cmdop/node
 * Node.js SDK for CMDOP agent interaction via gRPC
 */

// ============================================================================
// Re-export core types and errors
// ============================================================================

export * from '@cmdop/core';

// ============================================================================
// Schema utilities (Zod)
// ============================================================================

export { z, zodToJsonSchema } from './schema';
export type { ZodToJsonSchemaOptions, InferSchema } from './schema';

// ============================================================================
// Error mapping utilities
// ============================================================================

export { mapGrpcError, withErrorMapping } from './errors';
export type { ErrorContext } from './errors';

// ============================================================================
// Client
// ============================================================================

export { CMDOPClient } from './client';
export type { LocalClientOptions, RemoteClientOptions } from './client';

// ============================================================================
// Transport layer
// ============================================================================

export { LocalTransport, RemoteTransport } from './transport';
export type {
  Transport,
  AgentInfo,
  LocalTransportOptions,
  RemoteTransportOptions,
} from './transport';

// ============================================================================
// Services
// ============================================================================

export { TerminalService, FilesService, AgentService } from './services';
export type {
  CreateSessionOptions,
  ListSessionsOptions,
  SessionInfo,
  SessionStatusInfo,
  // Files types
  FileEntry,
  ListOptions,
  ListResult,
  ReadOptions,
  ReadResult,
  WriteOptions,
  DeleteOptions,
  CopyOptions,
  MoveOptions,
  SearchOptions,
  // Agent types
  AgentMode,
  RunAgentOptions,
  ToolResult,
  Usage,
  AgentResult,
} from './services';

// ============================================================================
// Proto-generated types (for advanced usage)
// ============================================================================

// Service definition
export {
  TerminalStreamingServiceDefinition,
  type TerminalStreamingServiceClient,
  type TerminalStreamingServiceImplementation,
} from './generated/service';

// Common types
export {
  SessionStatus,
  CommandStatus,
  LogLevel,
  type TerminalSize,
  type SessionConfig,
  type SystemMetrics,
} from './generated/common_types';

// Session messages
export type {
  CreateSessionRequest,
  CreateSessionResponse,
  CloseSessionRequest,
  CloseSessionResponse,
  GetSessionStatusRequest,
  GetSessionStatusResponse,
  ListSessionsRequest,
  ListSessionsResponse,
  SessionInfoItem,
} from './generated/rpc_messages/session';

// Terminal messages
export type {
  SendInputRequest,
  SendInputResponse,
  SendResizeRequest,
  SendResizeResponse,
  SendSignalRequest,
  SendSignalResponse,
} from './generated/rpc_messages/terminal';
