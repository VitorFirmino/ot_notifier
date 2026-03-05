export type LoggerStats = {
  online: number;
  offline: number;
  changes: number;
  errors: number;
  cached: number;
  fetched: number;
  saved: boolean;
  duration: string;
};

export interface Logger {
  info: (message: string, ...args: unknown[]) => void;
  success: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  log: (message: string, ...args: unknown[]) => void;
  start: (message: string) => void;
  ready: (message: string) => void;
  section: (title: string) => void;
  compact: (message: string) => void;
  stats: (stats: LoggerStats) => void;
  progress: (current: number, total: number, showAlways?: boolean) => void;
  box: (title: string, content: string) => void;
  process: (message: string) => void;
  verification: (message: string) => void;
}

const noop = (): void => {};

export const createLogger = (_serverId: string): Logger => ({
  info: noop,
  success: noop,
  error: noop,
  warn: noop,
  log: noop,
  start: noop,
  ready: noop,
  section: noop,
  compact: noop,
  stats: noop,
  progress: noop,
  box: noop,
  process: noop,
  verification: noop,
});

export const logger = {
  info: noop,
  success: noop,
  error: noop,
  warn: noop,
  log: noop,
} as any;
