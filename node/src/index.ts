/**
 * @cmdop/node
 * Node.js SDK for CMDOP agent interaction via gRPC
 */

// ============================================================================
// Logging
// ============================================================================

export { logger } from './logging';
export type { Logger, SdkLogLevel } from './logging';

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
// Error mapping utilities + extended error hierarchy
// ============================================================================

export { mapGrpcError, withErrorMapping } from './errors';
export type { ErrorContext } from './errors';

// Extended error classes (Node.js SDK-specific)
export {
  // Connection
  AgentNotRunningError,
  StalePortFileError,
  ConnectionLostError,
  // Auth
  InvalidAPIKeyError,
  TokenExpiredError,
  // Agent
  AgentError,
  AgentOfflineError,
  AgentBusyError,
  FeatureNotAvailableError,
  // Session
  SessionInterruptedError,
  // Files
  FileTooLargeError,
  // Browser
  BrowserError,
  BrowserSessionClosedError,
  BrowserNavigationError,
  BrowserElementNotFoundError,
  // Rate limiting
  RateLimitError,
} from './errors';

// ============================================================================
// Client
// ============================================================================

export { CMDOPClient } from './client';
export type { LocalClientOptions, RemoteClientOptions } from './client';

// ============================================================================
// Discovery
// ============================================================================

export { AgentDiscovery, listAgents, getOnlineAgents } from './discovery';
export type { RemoteAgentInfo, AgentStatus } from './discovery';

// ============================================================================
// Config
// ============================================================================

export { getSettings, configure, resetSettings } from './config';
export type { SDKSettings } from './config';

// ============================================================================
// Models (Zod schemas + inferred types)
// ============================================================================

export {
  sdkObject,
  // terminal
  SessionStateSchema,
  CreateSessionOptionsSchema,
  ListSessionsOptionsSchema,
  SessionInfoSchema,
  SessionStatusInfoSchema,
  SetMachineResultSchema,
  OutputChunkSchema,
  // files
  FileTypeSchema,
  FileEntrySchema,
  ListOptionsSchema,
  ListResultSchema,
  ReadOptionsSchema,
  ReadResultSchema,
  WriteOptionsSchema,
  DeleteOptionsSchema,
  CopyOptionsSchema,
  MoveOptionsSchema,
  SearchOptionsSchema,
  // agent
  AgentModeSchema,
  RunAgentOptionsSchema,
  ToolResultSchema,
  UsageSchema,
  AgentResultSchema,
  // config
  ConnectionConfigSchema,
  RetryConfigSchema,
  KeepaliveConfigSchema,
  CircuitBreakerConfigSchema,
  // download
  DownloadMetricsSchema,
  DownloadResultSchema,
} from './models';
export type {
  SessionState,
  OutputChunk,
  FileType,
  ConnectionConfig,
  RetryConfig,
  KeepaliveConfig,
  CircuitBreakerConfig,
} from './models';

// ============================================================================
// Streaming
// ============================================================================

export { StreamState, AgentStream, TerminalStream } from './streaming';
export type {
  AgentStreamEvent,
  AgentTokenEvent,
  AgentToolStartEvent,
  AgentToolEndEvent,
  AgentThinkingEvent,
  AgentErrorEvent,
  AgentHandoffEvent,
  AgentCancelledEvent,
  AgentDoneEvent,
  AgentStreamCallback,
  TerminalStreamEvent,
  TerminalOutputEvent,
  TerminalStatusEvent,
  TerminalErrorEvent,
  TerminalStreamCallback,
  TerminalStreamOptions,
  StreamMetrics,
} from './streaming';

// ============================================================================
// Transport layer
// ============================================================================

export { BaseTransport, LocalTransport, RemoteTransport } from './transport';
export type {
  Transport,
  AgentInfo,
  LocalTransportOptions,
  RemoteTransportOptions,
} from './transport';

// ============================================================================
// Services
// ============================================================================

export { BaseService, TerminalService, FilesService, AgentService, ExtractService, BrowserService, BrowserSession, DownloadService } from './services';
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
  // Terminal extra
  SetMachineResult,
  // Extract types
  ExtractServiceOptions,
  ExtractMetrics,
  ExtractResult,
  // Browser types
  BrowserSessionOptions,
  NavigateOptions,
  ClickOptions,
  TypeOptions,
  WaitOptions,
  BrowserExtractOptions,
  ScreenshotOptions,
  BrowserState,
  ScrollOptions,
  ScrollResult,
  MouseMoveOptions,
  HoverOptions,
  PageInfo,
  BrowserCookie,
  GetCookiesOptions,
  ExtractRegexOptions,
  ExtractFieldDef,
  ExtractDataOptions,
  ExtractDataResult,
  ValidateSelectorsOptions,
  ValidateSelectorsResult,
  NetworkEnableOptions,
  NetworkGetExchangesOptions,
  NetworkExchange,
  NetworkStats,
  NetworkExportHAROptions,
  // Download types
  DownloadResult,
  DownloadMetrics,
  DownloadFileOptions,
  DownloadUrlOptions,
} from './services';

// ============================================================================
// Proto-generated types (for advanced usage)
// ============================================================================

// Service definition
export {
  TerminalStreamingServiceDefinition,
  type TerminalStreamingServiceClient,
  type TerminalStreamingServiceImplementation,
} from './proto/generated/service';

// Common types
export {
  SessionStatus,
  CommandStatus,
  LogLevel,
  type TerminalSize,
  type SessionConfig,
  type SystemMetrics,
} from './proto/generated/common_types';

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
} from './proto/generated/rpc_messages/session';

// Terminal messages
export type {
  SendInputRequest,
  SendInputResponse,
  SendResizeRequest,
  SendResizeResponse,
  SendSignalRequest,
  SendSignalResponse,
} from './proto/generated/rpc_messages/terminal';
