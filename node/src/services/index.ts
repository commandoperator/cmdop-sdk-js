/**
 * Service layer - high-level API over gRPC
 */

export { TerminalService } from './terminal';
export type {
  CreateSessionOptions,
  ListSessionsOptions,
  SessionInfo,
  SessionStatusInfo,
} from './terminal';

export { FilesService } from './files';
export type {
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
} from './files';

export { AgentService } from './agent';
export type {
  AgentMode,
  RunAgentOptions,
  ToolResult,
  Usage,
  AgentResult,
} from './agent';
