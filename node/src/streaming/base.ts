/**
 * Base types for streaming support
 */

import type { AgentResult } from '../models/agent';

// ============================================================================
// StreamState
// ============================================================================

export enum StreamState {
  IDLE         = 'IDLE',
  CONNECTING   = 'CONNECTING',
  REGISTERING  = 'REGISTERING',
  CONNECTED    = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  CLOSING      = 'CLOSING',
  CLOSED       = 'CLOSED',
  ERROR        = 'ERROR',
}

// ============================================================================
// Agent stream events
// ============================================================================

export interface AgentTokenEvent {
  type: 'token';
  requestId: string;
  token: string;
  timestamp: number;
}

export interface AgentToolStartEvent {
  type: 'tool_start';
  requestId: string;
  toolName: string;
  payload: string;
  timestamp: number;
}

export interface AgentToolEndEvent {
  type: 'tool_end';
  requestId: string;
  toolName: string;
  payload: string;
  timestamp: number;
}

export interface AgentThinkingEvent {
  type: 'thinking';
  requestId: string;
  payload: string;
  timestamp: number;
}

export interface AgentErrorEvent {
  type: 'error';
  requestId: string;
  message: string;
  timestamp: number;
}

export interface AgentHandoffEvent {
  type: 'handoff';
  requestId: string;
  payload: string;
  timestamp: number;
}

export interface AgentCancelledEvent {
  type: 'cancelled';
  requestId: string;
  timestamp: number;
}

export interface AgentDoneEvent {
  type: 'done';
  result: AgentResult;
}

export type AgentStreamEvent =
  | AgentTokenEvent
  | AgentToolStartEvent
  | AgentToolEndEvent
  | AgentThinkingEvent
  | AgentErrorEvent
  | AgentHandoffEvent
  | AgentCancelledEvent
  | AgentDoneEvent;

// ============================================================================
// Agent stream callbacks
// ============================================================================

export type AgentStreamCallback = (event: AgentStreamEvent) => void;

// ============================================================================
// Terminal stream events
// ============================================================================

export interface TerminalOutputEvent {
  type: 'output';
  data: Buffer;
  /** Total bytes in server buffer at this point */
  totalBytes: number;
}

export interface TerminalStatusEvent {
  type: 'status';
  /** Status string from server (e.g. 'connected', 'disconnected') */
  status: string;
}

export interface TerminalErrorEvent {
  type: 'error';
  error: Error;
}

export type TerminalStreamEvent =
  | TerminalOutputEvent
  | TerminalStatusEvent
  | TerminalErrorEvent;

export type TerminalStreamCallback = (event: TerminalStreamEvent) => void;

// ============================================================================
// Attach stream events (bidirectional gRPC via connectTerminal)
// ============================================================================

export interface AttachSessionReadyEvent {
  type: 'sessionReady';
}

export interface AttachOutputEvent {
  type: 'output';
  data: Buffer;
}

export interface AttachClosedEvent {
  type: 'closed';
  reason: string;
}

export interface AttachErrorEvent {
  type: 'error';
  error: Error;
}

export type AttachStreamEvent =
  | AttachSessionReadyEvent
  | AttachOutputEvent
  | AttachClosedEvent
  | AttachErrorEvent;

export type AttachStreamCallback = (event: AttachStreamEvent) => void;

// ============================================================================
// Stream metrics
// ============================================================================

export interface StreamMetrics {
  bytesSent: number;
  bytesReceived: number;
  pollCount: number;
  lastActivityAt: number;
  errors: number;
}
