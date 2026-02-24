/**
 * Command Output Component
 *
 * Terminal-style display for command execution results
 */

'use client';

import { Terminal, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { CommandOutputProps } from './types';

export function CommandOutput({ execution, className }: CommandOutputProps) {
  const statusIcon = {
    pending: <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />,
    running: <Loader2 className="h-3 w-3 animate-spin text-blue-500" />,
    completed: <CheckCircle className="h-3 w-3 text-green-500" />,
    error: <XCircle className="h-3 w-3 text-red-500" />,
  };

  return (
    <div
      className={cn(
        'rounded-md border bg-zinc-950 text-zinc-100 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
        <Terminal className="h-3 w-3 text-zinc-400" />
        <code className="text-xs text-zinc-300 flex-1 truncate">
          {execution.command || 'Executing...'}
        </code>
        {statusIcon[execution.status]}
        {execution.exitCode !== undefined && (
          <span
            className={cn(
              'text-xs',
              execution.exitCode === 0 ? 'text-green-400' : 'text-red-400'
            )}
          >
            exit {execution.exitCode}
          </span>
        )}
      </div>

      {/* Output */}
      {execution.output && (
        <pre className="p-3 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
          {execution.output}
        </pre>
      )}

      {/* Empty state for running */}
      {!execution.output && execution.status === 'running' && (
        <div className="p-3 text-xs text-zinc-500">
          Waiting for output...
        </div>
      )}
    </div>
  );
}
