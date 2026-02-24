/**
 * Chat Input Component
 *
 * Auto-expanding textarea with send button
 */

'use client';

import { useState, useRef, useMemo, type KeyboardEvent, type ChangeEvent, type FormEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { ChatInputProps } from './types';

export function ChatInput({
  onSend,
  disabled = false,
  isLoading = false,
  placeholder = 'Type a message...',
  className,
  inputClassName,
  buttonClassName,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pre-compute derived state
  const hasValue = Boolean(value.trim());
  const isInputDisabled = disabled || isLoading;
  const isButtonDisabled = !hasValue || isInputDisabled;
  const inputPlaceholder = disabled ? 'Not available...' : placeholder;

  // Pre-compute button icon
  const buttonIcon = useMemo(() => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    return <Send className="h-4 w-4" />;
  }, [isLoading]);

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);

    // Auto-expand textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    const newHeight = Math.min(
      Math.max(textarea.scrollHeight, 44),
      120
    );
    textarea.style.height = `${newHeight}px`;
  };

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!hasValue || isInputDisabled) return;

    onSend(value);
    setValue('');

    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn('p-3 border-t border-border', className)}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={inputPlaceholder}
          disabled={isInputDisabled}
          className={cn(
            'flex-1 min-h-[44px] max-h-[120px] resize-none rounded-md px-3 py-2 text-sm',
            'bg-muted border-0 outline-none focus:ring-2 focus:ring-ring',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            inputClassName
          )}
          rows={1}
        />
        <button
          type="submit"
          disabled={isButtonDisabled}
          className={cn(
            'h-10 w-10 shrink-0 rounded-md inline-flex items-center justify-center',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            buttonClassName
          )}
        >
          {buttonIcon}
        </button>
      </form>
    </div>
  );
}
