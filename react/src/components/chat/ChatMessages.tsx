/**
 * Chat Messages Component
 *
 * Uses flex-col-reverse for natural bottom scroll + infinite scroll for history
 */

'use client';

import { useEffect, useRef, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { TypingIndicator } from './TypingIndicator';
import type { BaseMessage, ChatMessagesProps } from './types';

export function ChatMessages<T extends BaseMessage>({
  messages,
  renderMessage,
  onLoadMore,
  isLoadingHistory = false,
  hasMoreHistory = false,
  isStreaming = false,
  emptyState,
  className,
  loadingIndicator,
  typingIndicator,
}: ChatMessagesProps<T>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Pre-compute derived state
  const isEmpty = messages.length === 0;
  const showEmptyState = isEmpty && Boolean(emptyState);
  const hasStreamingMessage = useMemo(
    () => messages.some((m) => m.isStreaming),
    [messages]
  );
  const shouldShowTypingIndicator = isStreaming && !hasStreamingMessage;

  // Pre-compute rendered messages
  const renderedMessages = useMemo(
    () => messages.map((message) => (
      <div key={message.id}>{renderMessage(message)}</div>
    )),
    [messages, renderMessage]
  );

  // Pre-compute load more indicator
  const loadMoreIndicator = useMemo(() => {
    if (!hasMoreHistory) return null;

    const content = loadingIndicator ?? (isLoadingHistory ? (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading older messages...</span>
      </div>
    ) : (
      <div className="text-xs text-muted-foreground">
        Scroll up to load more
      </div>
    ));

    return (
      <div ref={loadMoreRef} className="flex justify-center py-4">
        {content}
      </div>
    );
  }, [hasMoreHistory, isLoadingHistory, loadingIndicator]);

  // Pre-compute typing indicator
  const typingIndicatorElement = useMemo(() => {
    if (!shouldShowTypingIndicator) return null;
    return typingIndicator ?? <TypingIndicator />;
  }, [shouldShowTypingIndicator, typingIndicator]);

  // Infinite scroll: Load more when scrolling to top
  useEffect(() => {
    if (!loadMoreRef.current || !onLoadMore || !hasMoreHistory || isLoadingHistory) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [onLoadMore, hasMoreHistory, isLoadingHistory]);

  // Show empty state if no messages
  if (showEmptyState) {
    return (
      <div className={cn('flex-1 flex items-center justify-center p-8', className)}>
        {emptyState}
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className={cn('flex-1 min-h-0 p-4 overflow-y-auto flex flex-col-reverse', className)}
    >
      <div className="space-y-4">
        {loadMoreIndicator}
        {renderedMessages}
        {typingIndicatorElement}
      </div>
    </div>
  );
}
