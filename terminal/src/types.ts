/**
 * Terminal Types
 */

/**
 * Terminal theme (xterm.js compatible)
 */
export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent?: string;
  selectionBackground: string;
  selectionForeground?: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

/**
 * Terminal display configuration
 */
export interface TerminalDisplayConfig {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  scrollback: number;
  cursorBlink: boolean;
  cursorStyle: 'block' | 'underline' | 'bar';
}

/**
 * Terminal emulator props
 */
export interface TerminalEmulatorProps {
  /** Called when user types in terminal */
  onInput?: (data: string) => void;
  /** Called when terminal is resized */
  onResize?: (cols: number, rows: number) => void;
  /** Custom theme */
  theme?: Partial<TerminalTheme>;
  /** Custom display config */
  displayConfig?: Partial<TerminalDisplayConfig>;
  /** Additional CSS class */
  className?: string;
  /** Whether terminal should auto-focus */
  autoFocus?: boolean;
}

/**
 * Terminal emulator ref handle
 */
export interface TerminalEmulatorHandle {
  /** Write data to terminal */
  write: (data: string) => void;
  /** Write line to terminal */
  writeln: (data: string) => void;
  /** Clear terminal */
  clear: () => void;
  /** Focus terminal */
  focus: () => void;
  /** Blur terminal */
  blur: () => void;
  /** Fit terminal to container */
  fit: () => void;
  /** Get current dimensions */
  getDimensions: () => { cols: number; rows: number } | null;
  /** Scroll to bottom */
  scrollToBottom: () => void;
}

/**
 * Terminal toolbar props
 */
export interface TerminalToolbarProps {
  /** Whether shell is connected */
  isConnected: boolean;
  /** Whether operation is in progress */
  isLoading?: boolean;
  /** Session ID (for display) */
  sessionId?: string;
  /** Error message */
  error?: string | null;
  /** Called to create shell */
  onCreateShell?: () => void;
  /** Called to close shell */
  onCloseShell?: () => void;
  /** Called to send signal */
  onSignal?: (signal: 'SIGINT' | 'SIGTERM' | 'SIGKILL') => void;
  /** Called to clear error */
  onClearError?: () => void;
  /** Additional CSS class */
  className?: string;
}
