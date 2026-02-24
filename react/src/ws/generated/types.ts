/**
 * Generated TypeScript Types
 * Auto-generated - DO NOT EDIT
 */

// =============================================================================
// ENUMS
// =============================================================================

export const enum WsFileChangeType {
  UNSPECIFIED = 0,
  CREATE = 1,
  MODIFY = 2,
  DELETE = 3,
  MOVE = 4,
}

export const enum WsFileIconType {
  UNSPECIFIED = 0,
  FILE = 1,
  CODE = 2,
  TEXT = 3,
  IMAGE = 4,
  VIDEO = 5,
  AUDIO = 6,
  ARCHIVE = 7,
  DATA = 8,
  PDF = 9,
  FOLDER = 10,
  FOLDER_HOME = 11,
  FOLDER_DESKTOP = 12,
  FOLDER_DOCUMENTS = 13,
  FOLDER_DOWNLOADS = 14,
  FOLDER_PICTURES = 15,
  FOLDER_MUSIC = 16,
  FOLDER_VIDEOS = 17,
  FOLDER_APPLICATIONS = 18,
  FOLDER_LIBRARY = 19,
  FOLDER_SYSTEM = 20,
  FOLDER_DRIVE = 21,
  FOLDER_CLOUD = 22,
  FOLDER_TRASH = 23,
  FOLDER_HIDDEN = 24,
  FOLDER_CODE = 25,
  FOLDER_SERVER = 26,
  FOLDER_DATABASE = 27,
  FOLDER_ARCHIVE = 28,
}

export const enum WsLoadMethod {
  UNSPECIFIED = 0,
  RPC = 1,
  HTTP_STREAM = 2,
  SKIP = 3,
  HTTP_TRANSCODE = 4,
  HTTP_HLS = 5,
}

export const enum WsSearchMatchType {
  UNSPECIFIED = 0,
  FILENAME = 1,
  CONTENT = 2,
}

export const enum WsViewerType {
  UNKNOWN = 0,
  CODE = 1,
  TEXT = 2,
  IMAGE = 3,
  VIDEO = 4,
  AUDIO = 5,
  PDF = 6,
  MARKDOWN = 7,
  JSON = 8,
  YAML = 9,
  XML = 10,
  ARCHIVE = 11,
  HEX = 12,
}

export interface WsCreateArchiveParams {
  /** Terminal session UUID */
  session_id: string;
  /** Files/directories to archive */
  source_paths: string[];
  /** Archive destination (auto-generated if empty) */
  destination_path?: string;
  /** Archive format: zip, tar, tar.gz */
  format?: string;
  /** Include hidden files */
  include_hidden?: boolean;
}

export interface WsGetChangesParams {
  /** Agent session ID */
  session_id: string;
  /** Root path to get changes from */
  path?: string;
  /** Sequence number to get changes since */
  since_sequence?: number;
  /** Maximum number of changes to return */
  limit?: number;
}

export interface WsContentMatch {
  line_number: number;
  line: string;
  column_start: number;
  column_end: number;
  context_before?: string[];
  context_after?: string[];
}

export interface WsFileEntry {
  name: string;
  path: string;
  type: string;
  size: number;
  permissions: string;
  owner: string;
  modified_at: string;
  is_hidden: boolean;
  is_readable: boolean;
  is_writable: boolean;
  mime_type?: string | null;
  symlink_target?: string | null;
  icon_type?: WsFileIconType;
  is_system?: boolean;
  viewer_type?: WsViewerType;
  load_method?: WsLoadMethod;
  media_metadata?: WsMediaMetadata | null;
}

export interface WsMediaMetadata {
  duration_seconds?: number;
  bitrate_kbps?: number;
  sample_rate_hz?: number;
  audio_channels?: number;
  audio_codec?: string;
  width?: number;
  height?: number;
  frame_rate?: number;
  video_codec?: string;
  title?: string;
  artist?: string;
  album?: string;
  album_artist?: string;
  genre?: string;
  year?: number;
  track_number?: number;
  disc_number?: number;
  comment?: string;
  composer?: string;
  cover_art?: string | null;
  cover_art_mime_type?: string;
  container_format?: string;
  has_video?: boolean;
  has_audio?: boolean;
}

export interface WsSearchMatch {
  entry: WsFileEntry;
  match_type?: WsSearchMatchType;
  content_matches?: WsContentMatch[];
}

export interface WsSearchResult {
  success: boolean;
  error?: string | null;
  matches?: WsSearchMatch[];
  total_matches?: number;
  truncated?: boolean;
  search_path?: string;
  files_scanned?: number;
  duration_ms?: number;
}

export interface WsCheckVersionParams {
  /** Client API version hash */
  client_version: string;
}

export interface WsTerminalCreateSessionParams {
  /** Optional session name */
  name?: string;
  /** Shell to use */
  shell?: string;
  /** Initial working directory */
  working_directory?: string;
}

export interface WsTransferInfo {
  transfer_id: string;
  source_session_id: string;
  target_session_id: string;
  source_path: string;
  target_path: string;
  file_size: number;
  state: string;
  upload_progress: number;
  download_progress: number;
  is_source: boolean;
  is_target: boolean;
}

export interface WsListTransfersResult {
  success: boolean;
  transfers?: WsTransferInfo[];
  error?: string | null;
}

export interface WsTerminalCloseParams {
  /** Terminal session UUID */
  session_id: string;
  /** Reason for closing */
  reason?: string;
}

export interface WsCreateDirectoryResult {
  success: boolean;
  error?: string | null;
  path?: string;
}

export interface WsMessageItem {
  id: string;
  role: string;
  content: string;
  response_text?: string;
  status: string;
  error?: string;
  created_at: string;
  iterations?: number;
}

export interface WsMessageListResult {
  success: boolean;
  messages?: WsMessageItem[];
  has_more?: boolean;
  error?: string;
}

export interface WsListSessionsParams {
  /** Max sessions to return */
  limit?: number;
}

export interface WsBrowserExecuteScriptParams {
  /** Terminal session UUID (agent connection) */
  session_id: string;
  /** Browser session ID */
  browser_session_id: string;
  /** JavaScript code to execute */
  script: string;
}

export interface WsTransferStatusResult {
  found: boolean;
  transfer_id?: string;
  state?: string;
  source_session_id?: string;
  target_session_id?: string;
  source_path?: string;
  target_path?: string;
  file_size?: number;
  stored_size?: number;
  upload_progress?: number;
  download_progress?: number;
  total_chunks?: number;
  chunks_uploaded?: number;
  chunks_downloaded?: number;
  error?: string | null;
}

export interface WsTerminalHistoryParams {
  /** Terminal session UUID */
  session_id: string;
  /** Max commands to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

export interface WsInitiateTransferResult {
  success: boolean;
  transfer_id?: string;
  chunk_size?: number;
  total_chunks?: number;
  error?: string | null;
}

export interface WsInitiateTransferParams {
  /** Source device session ID */
  source_session_id: string;
  /** Target device session ID */
  target_session_id: string;
  /** File path on source device */
  source_path: string;
  /** Destination path on target device */
  target_path: string;
  /** Total file size in bytes */
  file_size: number;
  /** MD5 checksum of entire file (optional) */
  file_checksum?: string;
  /** Chunk size for transfer */
  chunk_size?: number;
}

export interface WsBrowserValidateSelectorsParams {
  /** Terminal session UUID (agent connection) */
  session_id: string;
  /** Browser session ID */
  browser_session_id: string;
  /** CSS selector for repeating item container */
  item: string;
  /** Field name to CSS selector mapping */
  fields: Record<string, any>;
}

export interface WsBrowserValidateSelectorsResult {
  success: boolean;
  valid?: boolean;
  counts?: Record<string, any>;
  samples?: Record<string, any>;
  errors?: string[];
  error?: string;
}

export interface WsGetFileInfoResult {
  success: boolean;
  error?: string | null;
  entry?: WsFileEntry | null;
  is_text?: boolean;
}

export interface WsListDirectoryResult {
  success: boolean;
  error?: string | null;
  current_path?: string;
  entries?: WsFileEntry[];
  next_page_token?: string;
  total_count?: number;
  has_more?: boolean;
  file_count?: number;
  directory_count?: number;
}

export interface WsChatCreateSessionParams {
  /** Workspace UUID */
  workspace_id: string;
  /** Optional session title */
  title?: string;
}

export interface WsBrowserExtractRegexParams {
  /** Terminal session UUID (agent connection) */
  session_id: string;
  /** Browser session ID */
  browser_session_id: string;
  /** Regex pattern */
  pattern: string;
  /** Source: `html` or `text` */
  source?: string;
  /** Max matches */
  limit?: number;
}

export interface WsCancelTransferResult {
  success: boolean;
  error?: string | null;
}

export interface WsDeleteResult {
  success: boolean;
  error?: string | null;
  deleted_path?: string;
  files_deleted?: number;
  dirs_deleted?: number;
}

export interface WsMoveResult {
  success: boolean;
  error?: string | null;
  path?: string;
}

export interface WsChannelAuthResult {
  authorized: boolean;
  error?: string;
}

export interface WsBrowserExecuteScriptResult {
  success: boolean;
  result?: string;
  error?: string;
}

export interface WsChatSessionResult {
  success: boolean;
  session_id?: string;
  error?: string;
}

export interface WsGetSessionParams {
  /** Terminal session UUID */
  session_id: string;
}

export interface WsReadFileResult {
  success: boolean;
  error?: string | null;
  content?: string;
  total_size?: number;
  read_size?: number;
  mime_type?: string | null;
  is_text?: boolean;
  viewer_type?: WsViewerType;
}

export interface WsSearchParams {
  /** Terminal session UUID */
  session_id: string;
  /** Base directory to search */
  path?: string;
  /** Glob pattern for filenames (e.g., `*.ts`, `**\/*.go`) */
  filename_pattern?: string;
  /** Regex pattern for file content */
  content_pattern?: string;
  /** Case sensitivity for content search */
  case_sensitive?: boolean;
  /** Include hidden files/directories */
  include_hidden?: boolean;
  /** Maximum results */
  max_results?: number;
  /** Maximum directory depth (0 = unlimited) */
  max_depth?: number;
  /** Lines of context around matches */
  context_lines?: number;
}

export interface WsMessageResult {
  success: boolean;
  message_id?: string;
  status?: string;
  error?: string;
}

export interface WsBrowserExtractDataParams {
  /** Terminal session UUID (agent connection) */
  session_id: string;
  /** Browser session ID */
  browser_session_id: string;
  /** CSS selector for repeating item container */
  item: string;
  /** Field extractors (string or {selector, attr, regex}) */
  fields: Record<string, any>;
  /** Max items to extract */
  limit?: number;
}

export interface WsTerminalResizeParams {
  /** Terminal session UUID */
  session_id: string;
  /** Number of columns */
  cols: number;
  /** Number of rows */
  rows: number;
}

export interface WsCancelTransferParams {
  /** Transfer ID to cancel */
  transfer_id: string;
}

export interface WsCreateDirectoryParams {
  /** Terminal session UUID */
  session_id: string;
  /** Directory path to create */
  path: string;
  /** Create parent directories */
  create_parents?: boolean;
}

export interface WsSessionResult {
  session_id: string;
  name: string;
  status: string;
  shell: string;
  working_directory: string;
  agent_hostname?: string;
  commands_count?: number;
}

export interface WsMoveParams {
  /** Terminal session UUID */
  session_id: string;
  /** Source path */
  source_path: string;
  /** Destination path */
  destination_path: string;
  /** Overwrite if exists */
  overwrite?: boolean;
}

export interface WsListTransfersParams {
  /** Session ID to list transfers for */
  session_id: string;
  /** Include completed transfers */
  include_completed?: boolean;
}

export interface WsSuccessResult {
  success: boolean;
  message?: string;
}

export interface WsGetFileInfoParams {
  /** Terminal session UUID */
  session_id: string;
  /** File path */
  path: string;
}

export interface WsFileChange {
  /** Type of change (create, modify, delete, rename) */
  change_type: WsFileChangeType;
  /** File entry (null for delete) */
  item?: WsFileEntry | null;
  /** Previous path (for rename operations) */
  old_path?: string;
}

export interface WsGetChangesResult {
  /** Whether operation succeeded */
  success?: boolean;
  /** Error message if failed */
  error?: string;
  /** List of file changes */
  changes?: WsFileChange[];
  /** Current sequence number (for next sync) */
  current_sequence?: number;
  /** Server timestamp (Unix epoch) */
  server_timestamp?: number;
  /** Whether there are more changes to fetch */
  has_more?: boolean;
  /** Cursor for pagination (if has_more is true) */
  next_cursor?: string;
  /** MD5 hash of directory state for integrity check */
  state_digest?: string;
}

export interface WsBrowserExtractRegexResult {
  success: boolean;
  matches?: Record<string, any>[];
  count?: number;
  error?: string;
}

export interface WsTerminalInputParams {
  /** Terminal session UUID */
  session_id: string;
  /** Input data (base64 encoded) */
  data: string;
}

export interface WsSessionListResult {
  sessions: WsSessionResult[];
  total: number;
}

export interface WsChannelAuthParams {
  /** Channel name to authorize */
  channel: string;
}

export interface WsGetHistoryParams {
  /** Workspace UUID */
  workspace_id: string;
  /** Filter by session UUID */
  session_id?: string | null;
  /** Max messages to return */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

export interface WsWriteFileParams {
  /** Terminal session UUID */
  session_id: string;
  /** File path to write */
  path: string;
  /** File content (base64 encoded) */
  content: string;
  /** Overwrite if exists */
  overwrite?: boolean;
  /** Create parent directories */
  create_parents?: boolean;
}

export interface WsDeleteParams {
  /** Terminal session UUID */
  session_id: string;
  /** Path to delete */
  path: string;
  /** Delete directories recursively */
  recursive?: boolean;
}

export interface WsTransferStatusParams {
  /** Transfer ID */
  transfer_id: string;
}

export interface WsHistoryResult {
  commands: string[];
  total: number;
}

export interface WsReadFileParams {
  /** Terminal session UUID */
  session_id: string;
  /** File path to read */
  path: string;
  /** Start offset in bytes */
  offset?: number;
  /** Bytes to read (0 = entire file) */
  length?: number;
}

export interface WsCreateArchiveResult {
  success: boolean;
  error?: string | null;
  archive_path?: string;
  bytes_archived?: number;
  files_archived?: number;
  dirs_archived?: number;
}

export interface WsListDirectoryParams {
  /** Terminal session UUID */
  session_id: string;
  /** Directory path to list */
  path: string;
  /** Max entries per page */
  page_size?: number;
  /** Token for pagination */
  page_token?: string;
  /** Include hidden files */
  include_hidden?: boolean;
  /** Sort order */
  sort_order?: string;
}

export interface WsWriteFileResult {
  success: boolean;
  error?: string | null;
  bytes_written?: number;
  path?: string;
}

export interface WsBrowserExtractDataResult {
  success: boolean;
  items?: Record<string, any>[];
  count?: number;
  error?: string;
}

export interface WsVersionCheckResult {
  /** Whether versions are compatible */
  compatible: boolean;
  /** Client version received */
  client_version: string;
  /** Server API version hash */
  server_version: string;
  /** Additional info message */
  message?: string;
}

export interface WsTerminalSignalParams {
  /** Terminal session UUID */
  session_id: string;
  /** Signal number (2=SIGINT, 9=SIGKILL, 15=SIGTERM) */
  signal?: number;
}

export interface WsSendMessageParams {
  /** Workspace UUID */
  workspace_id: string;
  /** User message/prompt */
  message: string;
  /** Optional chat session UUID */
  session_id?: string | null;
  /** Target machine UUIDs for orchestrator mode (empty = all machines) */
  target_machine_ids?: string[];
  /** Client-generated message ID for optimistic UI updates */
  client_message_id?: string | null;
  /** Enable streaming response */
  stream?: boolean;
}

