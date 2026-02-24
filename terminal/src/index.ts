/**
 * @cmdop/terminal
 *
 * Terminal emulator components for CMDOP SDK
 */

// Components
export { TerminalEmulator } from './TerminalEmulator';

// Config
export {
  defaultTheme,
  defaultDisplayConfig,
  tokyoNightTheme,
  draculaTheme,
} from './config';

// Types
export type {
  TerminalTheme,
  TerminalDisplayConfig,
  TerminalEmulatorProps,
  TerminalEmulatorHandle,
  TerminalToolbarProps,
} from './types';
