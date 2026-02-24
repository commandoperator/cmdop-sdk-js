/**
 * Chat Components
 *
 * Reusable chat UI components and hooks for AI interactions
 */

// Components
export { ChatInput } from './ChatInput';
export { ChatMessages } from './ChatMessages';
export { MessageBubble } from './MessageBubble';
export { TypingIndicator } from './TypingIndicator';
export { CommandOutput } from './CommandOutput';
export { MachineChat } from './MachineChat';

// Hooks
export { useMessageOperations } from './useMessageOperations';
export { useMachineChat } from './useMachineChat';

// Types
export type {
  // Base types
  BaseMessage,
  // Component props
  ChatInputProps,
  ChatMessagesProps,
  MessageBubbleProps,
  TypingIndicatorProps,
  CommandOutputProps,
  MachineChatProps,
  // Hook types
  UseMessageOperationsResult,
  UseMachineChatOptions,
  UseMachineChatResult,
  // Machine chat types
  MachineMessage,
  CommandExecution,
  MachineCentrifugoMessage,
} from './types';
