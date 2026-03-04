/**
 * Service layer - high-level API over gRPC
 */

export { BaseService } from './base';
export { TerminalService } from './terminal';
export type {
  CreateSessionOptions,
  ListSessionsOptions,
  SessionInfo,
  SessionStatusInfo,
  SetMachineResult,
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

export { ExtractService } from './extract';
export type {
  ExtractOptions as ExtractServiceOptions,
  ExtractMetrics,
  ExtractResult,
} from './extract';

export { DownloadService } from './download';
export type {
  DownloadResult,
  DownloadMetrics,
  DownloadFileOptions,
  DownloadUrlOptions,
} from './download';

export { SkillsService } from './skills';
export type {
  SkillInfo,
  SkillDetail,
  SkillRunOptions,
  SkillRunResult,
} from './skills';
