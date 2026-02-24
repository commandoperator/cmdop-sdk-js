// subscriptions.ts
// Generated Channel Event Types
// Auto-generated - DO NOT EDIT
// Generated at: 2026-01-25T04:56:47.482147

// =============================================================================
// Nested Types
// =============================================================================

export interface WsFileChangeItem {
  path: string;
  name: string;
  is_directory?: boolean;
  size?: number;
  modified_at?: any;
  mime_type?: string;
}

export interface WsPlanStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  agent_id?: any;
  machine_id?: any;
  result?: any;
  error?: any;
}

// =============================================================================
// WsTerminalEvent - Terminal output and status events (output, status, error, command_complete)
// =============================================================================

export interface WsTerminalOutputEvent {
  type: 'output';
  message_id: string;
  client_message_id?: string;
  data: string;
  is_stderr?: boolean;
  sequence?: number;
  timestamp?: any;
}

export interface WsTerminalStatusEvent {
  type: 'status';
  message_id: string;
  client_message_id?: string;
  status: string;
  reason?: string;
  working_directory?: string;
  timestamp?: any;
}

export interface WsTerminalErrorEvent {
  type: 'error';
  message_id: string;
  client_message_id?: string;
  error_code: string;
  message: string;
  suggestions?: string[];
  can_retry?: boolean;
  is_fatal?: boolean;
  timestamp?: any;
}

export interface WsTerminalCommandCompleteEvent {
  type: 'command_complete';
  message_id: string;
  client_message_id?: string;
  command_id: string;
  exit_code: number;
  duration_ms: number;
  timestamp?: any;
}

/** Terminal output and status events (output, status, error, command_complete) */
export type WsTerminalEvent =
  | WsTerminalOutputEvent
  | WsTerminalStatusEvent
  | WsTerminalErrorEvent
  | WsTerminalCommandCompleteEvent
;

// =============================================================================
// WsFileChangesEvent - File system change events for NSFileProvider sync (created, modified, deleted, moved)
// =============================================================================

export interface WsFileCreatedEvent {
  type: 'file_created';
  message_id: string;
  client_message_id?: string;
  item: WsFileChangeItem;
  timestamp?: any;
}

export interface WsFileModifiedEvent {
  type: 'file_modified';
  message_id: string;
  client_message_id?: string;
  item: WsFileChangeItem;
  timestamp?: any;
}

export interface WsFileDeletedEvent {
  type: 'file_deleted';
  message_id: string;
  client_message_id?: string;
  path: string;
  name: string;
  was_directory?: boolean;
  timestamp?: any;
}

export interface WsFileMovedEvent {
  type: 'file_moved';
  message_id: string;
  client_message_id?: string;
  item: WsFileChangeItem;
  old_path: string;
  timestamp?: any;
}

export interface WsFileSyncCompleteEvent {
  type: 'sync_complete';
  message_id: string;
  client_message_id?: string;
  sequence: number;
  changes_count: number;
  has_more?: boolean;
  timestamp?: any;
}

/** File system change events for NSFileProvider sync (created, modified, deleted, moved) */
export type WsFileChangesEvent =
  | WsFileCreatedEvent
  | WsFileModifiedEvent
  | WsFileDeletedEvent
  | WsFileMovedEvent
  | WsFileSyncCompleteEvent
;

// =============================================================================
// WsAiChatEvent - AI chat streaming events (message chunks, orchestration, errors)
// =============================================================================

export interface WsMessageStartEvent {
  type: 'message_start';
  message_id: string;
  client_message_id?: string;
}

export interface WsMessageChunkEvent {
  type: 'message_chunk';
  message_id: string;
  client_message_id?: string;
  chunk: string;
}

export interface WsMessageCompleteEvent {
  type: 'message_complete';
  message_id: string;
  client_message_id?: string;
  content: string;
}

export interface WsErrorEvent {
  type: 'error';
  message_id: string;
  client_message_id?: string;
  error: string;
}

export interface WsOrchestrationRoutingEvent {
  type: 'orchestration_routing';
  message_id: string;
  client_message_id?: string;
  intent: string;
  needs_planning: boolean;
}

export interface WsOrchestrationPlanEvent {
  type: 'orchestration_plan';
  message_id: string;
  client_message_id?: string;
  iteration: number;
  steps: WsPlanStep[];
}

export interface WsOrchestrationStepStartEvent {
  type: 'orchestration_step_start';
  message_id: string;
  client_message_id?: string;
  step_id: string;
}

export interface WsOrchestrationStepCompleteEvent {
  type: 'orchestration_step_complete';
  message_id: string;
  client_message_id?: string;
  step_id: string;
  result: string;
}

export interface WsOrchestrationStepErrorEvent {
  type: 'orchestration_step_error';
  message_id: string;
  client_message_id?: string;
  step_id: string;
  error: string;
}

export interface WsOrchestrationEvaluationEvent {
  type: 'orchestration_evaluation';
  message_id: string;
  client_message_id?: string;
  goal_achieved: boolean;
  reasoning: string;
}

export interface WsOrchestrationCompleteEvent {
  type: 'orchestration_complete';
  message_id: string;
  client_message_id?: string;
  final_result: string;
  total_iterations: number;
}

/** AI chat streaming events (message chunks, orchestration, errors) */
export type WsAiChatEvent =
  | WsMessageStartEvent
  | WsMessageChunkEvent
  | WsMessageCompleteEvent
  | WsErrorEvent
  | WsOrchestrationRoutingEvent
  | WsOrchestrationPlanEvent
  | WsOrchestrationStepStartEvent
  | WsOrchestrationStepCompleteEvent
  | WsOrchestrationStepErrorEvent
  | WsOrchestrationEvaluationEvent
  | WsOrchestrationCompleteEvent
;

