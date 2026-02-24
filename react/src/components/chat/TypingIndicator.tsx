/**
 * Typing Indicator Component
 */

'use client';

import { Bot, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { TypingIndicatorProps } from './types';

export function TypingIndicator({ text = 'Thinking...', className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
        <Bot className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="text-sm rounded-md px-3 py-2 inline-block bg-muted">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-muted-foreground text-xs">{text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
