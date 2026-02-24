'use client';

import {
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { defaultTheme, defaultDisplayConfig } from './config';
import type {
  TerminalEmulatorProps,
  TerminalEmulatorHandle,
  TerminalTheme,
  TerminalDisplayConfig,
} from './types';

/**
 * Terminal Emulator Component
 *
 * A React wrapper around xterm.js that provides:
 * - Automatic resize handling
 * - Input/output callbacks
 * - Theming support
 * - Imperative handle for external control
 */
export const TerminalEmulator = forwardRef<TerminalEmulatorHandle, TerminalEmulatorProps>(
  function TerminalEmulator(
    {
      onInput,
      onResize,
      theme,
      displayConfig,
      className,
      autoFocus = false,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const isInitializedRef = useRef(false);

    // Merge configs with defaults
    const mergedTheme = useMemo<TerminalTheme>(
      () => ({ ...defaultTheme, ...theme }),
      [theme]
    );

    const mergedDisplayConfig = useMemo<TerminalDisplayConfig>(
      () => ({ ...defaultDisplayConfig, ...displayConfig }),
      [displayConfig]
    );

    // Store latest callbacks in refs to avoid re-initializing terminal
    const onInputRef = useRef(onInput);
    onInputRef.current = onInput;
    const onResizeRef = useRef(onResize);
    onResizeRef.current = onResize;

    // Initialize terminal
    useEffect(() => {
      if (!containerRef.current || isInitializedRef.current) return;

      const term = new Terminal({
        cursorBlink: mergedDisplayConfig.cursorBlink,
        cursorStyle: mergedDisplayConfig.cursorStyle,
        fontSize: mergedDisplayConfig.fontSize,
        fontFamily: mergedDisplayConfig.fontFamily,
        lineHeight: mergedDisplayConfig.lineHeight,
        scrollback: mergedDisplayConfig.scrollback,
        theme: mergedTheme,
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);

      term.open(containerRef.current);
      fitAddon.fit();

      terminalRef.current = term;
      fitAddonRef.current = fitAddon;
      isInitializedRef.current = true;

      // Handle input - use ref to always call latest callback
      term.onData((data) => {
        onInputRef.current?.(data);
      });

      // Auto-focus
      if (autoFocus) {
        term.focus();
      }

      // Initial resize callback
      if (onResize) {
        const dims = fitAddon.proposeDimensions();
        if (dims) {
          onResize(dims.cols, dims.rows);
        }
      }

      return () => {
        term.dispose();
        terminalRef.current = null;
        fitAddonRef.current = null;
        isInitializedRef.current = false;
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Handle resize
    useEffect(() => {
      const container = containerRef.current;
      const fitAddon = fitAddonRef.current;
      if (!container || !fitAddon) return;

      const handleResize = () => {
        fitAddon.fit();
        const dims = fitAddon.proposeDimensions();
        if (dims) {
          onResizeRef.current?.(dims.cols, dims.rows);
        }
      };

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    // Imperative handle
    const write = useCallback((data: string) => {
      terminalRef.current?.write(data);
    }, []);

    const writeln = useCallback((data: string) => {
      terminalRef.current?.writeln(data);
    }, []);

    const clear = useCallback(() => {
      terminalRef.current?.clear();
    }, []);

    const focus = useCallback(() => {
      terminalRef.current?.focus();
    }, []);

    const blur = useCallback(() => {
      terminalRef.current?.blur();
    }, []);

    const fit = useCallback(() => {
      fitAddonRef.current?.fit();
    }, []);

    const getDimensions = useCallback(() => {
      const dims = fitAddonRef.current?.proposeDimensions();
      return dims ? { cols: dims.cols, rows: dims.rows } : null;
    }, []);

    const scrollToBottom = useCallback(() => {
      terminalRef.current?.scrollToBottom();
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        write,
        writeln,
        clear,
        focus,
        blur,
        fit,
        getDimensions,
        scrollToBottom,
      }),
      [write, writeln, clear, focus, blur, fit, getDimensions, scrollToBottom]
    );

    // Handle container click -> focus
    const handleContainerClick = useCallback(() => {
      terminalRef.current?.focus();
    }, []);

    return (
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 100,
          backgroundColor: mergedTheme.background,
        }}
      />
    );
  }
);
