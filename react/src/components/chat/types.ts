/**
 * Chat Component Types
 */

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import type { WsAiChatEvent } from '../../ws/generated/subscriptions';

// Re-export base AI chat events from generated types
export type {
  WsAiChatEvent,
  WsMessageStartEvent,
  WsMessageChunkEvent,
  WsMessageCompleteEvent,
  WsErrorEvent,
  WsOrchestrationRoutingEvent,
  WsOrchestrationPlanEvent,
  WsOrchestrationStepStartEvent,
  WsOrchestrationStepCompleteEvent,
  WsOrchestrationStepErrorEvent,
  WsOrchestrationEvaluationEvent,
  WsOrchestrationCompleteEvent,
} from '../../ws/generated/subscriptions';

// =============================================================================
// Base Message
// =============================================================================

export interface BaseMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

// =============================================================================
// Component Props
// =============================================================================

export interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
}

export interface ChatMessagesProps<T extends BaseMessage> {
  messages: T[];
  renderMessage: (message: T) => ReactNode;
  onLoadMore?: () => void;
  isLoadingHistory?: boolean;
  hasMoreHistory?: boolean;
  isStreaming?: boolean;
  emptyState?: ReactNode;
  className?: string;
  loadingIndicator?: ReactNode;
  typingIndicator?: ReactNode;
}

export interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  isStreaming?: boolean;
  children?: ReactNode;
  className?: string;
  /** Render custom content instead of default text */
  renderContent?: (content: string, isUser: boolean) => ReactNode;
}

export interface TypingIndicatorProps {
  text?: string;
  className?: string;
}

// =============================================================================
// Hook Types
// =============================================================================

export interface UseMessageOperationsResult<T extends BaseMessage> {
  messages: T[];
  setMessages: Dispatch<SetStateAction<T[]>>;
  addMessage: (message: T) => void;
  updateMessage: (id: string, updates: Partial<T>) => void;
  appendContent: (id: string, chunk: string) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
}

// =============================================================================
// Machine Chat Types
// =============================================================================

export interface MachineMessage extends BaseMessage {
  /** Command executions attached to this message */
  executions?: CommandExecution[];
}

export interface CommandExecution {
  id: string;
  command: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  output: string;
  exitCode?: number;
  startedAt?: Date;
  completedAt?: Date;
}

/** Centrifugo RPC client interface (compatible with @djangocfg/centrifugo CentrifugoRPCClient) */
export interface CentrifugoClientInterface {
  /** Make typed RPC call (namedRPC from @djangocfg/centrifugo) */
  namedRPC<T = unknown>(method: string, params: unknown, options?: { timeout?: number }): Promise<T>;
}

export interface MachineChatProps {
  /** Workspace ID */
  workspaceId: string;
  /** Machine ID */
  machineId: string;
  /** Machine name for display */
  machineName?: string;
  /** External Centrifugo client for RPC calls (from @djangocfg/centrifugo) */
  centrifugoClient?: CentrifugoClientInterface;
  /**
   * Subscription data from external useSubscription hook.
   * Pass data from: useSubscription({ channel: `ai_chat:workspace:${workspaceId}` })
   */
  subscriptionData?: MachineCentrifugoMessage | null;
  /** Additional CSS classes */
  className?: string;
  /** Custom header renderer */
  renderHeader?: (machineName?: string) => ReactNode;
  /** Custom empty state renderer */
  renderEmptyState?: () => ReactNode;
}

export interface CommandOutputProps {
  execution: CommandExecution;
  className?: string;
}

// =============================================================================
// Machine Chat Centrifugo Message Types
// =============================================================================

// Base type with common fields (for machine-specific events)
interface CentrifugoMessageBase {
  message_id: string;
  client_message_id?: string;
}

// Machine-specific command execution events
export type MachineCommandEvent =
  | (CentrifugoMessageBase & { type: 'command_generated'; executions: CommandExecution[] })
  | (CentrifugoMessageBase & { type: 'execution_started'; execution_id: string; command: string })
  | (CentrifugoMessageBase & { type: 'output_chunk'; execution_id: string; chunk: string })
  | (CentrifugoMessageBase & { type: 'execution_completed'; execution_id: string; exit_code: number });

// Combined type: AI chat events + machine-specific events
export type MachineCentrifugoMessage =
  | WsAiChatEvent
  | MachineCommandEvent;

// =============================================================================
// Hook Options
// =============================================================================

export interface UseMachineChatOptions {
  workspaceId: string;
  machineId: string;
  /** External Centrifugo client for RPC calls (from @djangocfg/centrifugo) */
  centrifugoClient?: CentrifugoClientInterface;
  /**
   * Subscription data from external useSubscription hook.
   * Pass data from: useSubscription({ channel: `ai_chat:workspace:${workspaceId}` })
   */
  subscriptionData?: MachineCentrifugoMessage | null;
}

export interface UseMachineChatResult {
  messages: MachineMessage[];
  isLoadingHistory: boolean;
  hasMoreHistory: boolean;
  isExecuting: boolean;
  isStreaming: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  loadMoreMessages: () => void;
  clearMessages: () => void;
  clearError: () => void;
}
