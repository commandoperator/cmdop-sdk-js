/**
 * Message Bubble Component
 *
 * Base message bubble with slot for extended content
 */

'use client';

import { useMemo } from 'react';
import { Bot, User } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { MessageBubbleProps } from './types';

export function MessageBubble({
  role,
  content,
  timestamp,
  isStreaming,
  children,
  className,
  renderContent,
}: MessageBubbleProps) {
  // Pre-compute derived state
  const isUser = role === 'user';
  const hasContent = Boolean(content);
  const hasChildren = Boolean(children);
  const showTimestamp = Boolean(timestamp && !isStreaming);

  // Pre-compute formatted timestamp
  const formattedTimestamp = useMemo(() => {
    if (!timestamp) return null;
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [timestamp]);

  // Pre-compute message content
  const messageContent = useMemo(() => {
    if (hasContent && content) {
      // Use custom renderer if provided
      if (renderContent) {
        return renderContent(content, isUser);
      }
      // Default: simple text with whitespace preservation
      return <span className="whitespace-pre-wrap">{content}</span>;
    }
    if (isStreaming) {
      return <span className="text-muted-foreground">...</span>;
    }
    return null;
  }, [hasContent, content, isUser, isStreaming, renderContent]);

  // Pre-compute avatar
  const avatar = useMemo(() => {
    const Icon = isUser ? User : Bot;
    const iconClass = isUser ? 'text-primary-foreground' : 'text-muted-foreground';
    return <Icon className={cn('h-3.5 w-3.5', iconClass)} />;
  }, [isUser]);

  // Pre-compute extended content wrapper
  const extendedContent = useMemo(() => {
    if (!hasChildren) return null;
    return <div className="w-full max-w-[85%]">{children}</div>;
  }, [hasChildren, children]);

  // Pre-compute timestamp element
  const timestampElement = useMemo(() => {
    if (!showTimestamp) return null;
    return (
      <div className="text-xs text-muted-foreground">
        {formattedTimestamp}
      </div>
    );
  }, [showTimestamp, formattedTimestamp]);

  // Pre-compute class names
  const containerClass = cn('flex gap-2', isUser && 'flex-row-reverse', className);
  const avatarClass = cn(
    'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
    isUser ? 'bg-primary' : 'bg-muted'
  );
  const contentWrapperClass = cn('flex-1 space-y-2', isUser && 'flex flex-col items-end');
  const messageClass = cn(
    'rounded-md px-3 py-2 inline-block max-w-[85%] text-sm',
    isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
    isStreaming && 'animate-pulse'
  );

  return (
    <div className={containerClass}>
      {/* Avatar */}
      <div className={avatarClass}>{avatar}</div>

      {/* Content */}
      <div className={contentWrapperClass}>
        {/* Message text */}
        <div className={messageClass}>{messageContent}</div>

        {/* Extended content (command output, plan steps, etc.) */}
        {extendedContent}

        {/* Timestamp */}
        {timestampElement}
      </div>
    </div>
  );
}
