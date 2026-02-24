/**
 * Machine Chat Component
 *
 * Chat interface for single machine context
 */

'use client';

import { useMemo, useCallback } from 'react';
import { Terminal, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ChatInput } from './ChatInput';
import { ChatMessages } from './ChatMessages';
import { MessageBubble } from './MessageBubble';
import { CommandOutput } from './CommandOutput';
import { useMachineChat } from './useMachineChat';
import type { MachineChatProps, MachineMessage } from './types';

export function MachineChat({
  workspaceId,
  machineId,
  machineName,
  centrifugoClient,
  subscriptionData,
  className,
  renderHeader,
  renderEmptyState,
}: MachineChatProps) {
  const chat = useMachineChat({ workspaceId, machineId, centrifugoClient, subscriptionData });

  // Pre-compute derived state
  const hasMachineName = Boolean(machineName);
  const containerClass = cn('flex flex-col h-full', className);

  // Pre-compute machine name element
  const machineNameElement = useMemo(() => {
    if (!hasMachineName) return null;
    return (
      <span className="text-xs text-muted-foreground ml-auto">
        {machineName}
      </span>
    );
  }, [hasMachineName, machineName]);

  // Render message with command outputs
  const renderMessage = useCallback((message: MachineMessage) => {
    const executions = message.executions;
    const executionElements = executions?.map((exec) => (
      <CommandOutput key={exec.id} execution={exec} className="mt-2" />
    )) ?? null;

    return (
      <MessageBubble
        role={message.role}
        content={message.content}
        timestamp={message.timestamp}
        isStreaming={message.isStreaming}
      >
        {executionElements}
      </MessageBubble>
    );
  }, []);

  // Pre-compute empty state
  const emptyState = useMemo(() => {
    if (renderEmptyState) {
      return renderEmptyState();
    }
    return (
      <div className="text-center max-w-md">
        <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
        <h3 className="text-lg font-semibold mb-2">Ready to assist</h3>
        <p className="text-sm text-muted-foreground">
          Describe what you want to do on this machine, and I&apos;ll execute the commands for you.
        </p>
      </div>
    );
  }, [renderEmptyState]);

  // Pre-compute header
  const header = useMemo(() => {
    if (renderHeader) {
      return renderHeader(machineName);
    }
    return (
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Terminal className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">AI Assistant</span>
        {machineNameElement}
      </div>
    );
  }, [renderHeader, machineName, machineNameElement]);

  return (
    <div className={containerClass}>
      {/* Header */}
      {header}

      {/* Messages */}
      <ChatMessages
        messages={chat.messages}
        renderMessage={renderMessage}
        onLoadMore={chat.loadMoreMessages}
        isLoadingHistory={chat.isLoadingHistory}
        hasMoreHistory={chat.hasMoreHistory}
        isStreaming={chat.isStreaming}
        emptyState={emptyState}
      />

      {/* Input */}
      <ChatInput
        onSend={chat.sendMessage}
        isLoading={chat.isExecuting}
        placeholder="Describe what to do..."
      />
    </div>
  );
}
