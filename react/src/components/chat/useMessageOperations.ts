/**
 * Message Operations Hook
 *
 * Generic hook for managing chat messages
 */

import { useState, useCallback } from 'react';
import type { BaseMessage, UseMessageOperationsResult } from './types';

export function useMessageOperations<T extends BaseMessage>(): UseMessageOperationsResult<T> {
  const [messages, setMessages] = useState<T[]>([]);

  const addMessage = useCallback((message: T) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<T>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  }, []);

  const appendContent = useCallback((id: string, chunk: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, content: msg.content + chunk } : msg
      )
    );
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    setMessages,
    addMessage,
    updateMessage,
    appendContent,
    removeMessage,
    clearMessages,
  };
}
