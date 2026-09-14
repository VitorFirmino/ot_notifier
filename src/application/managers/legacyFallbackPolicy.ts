import type { ServerConfig } from "@shared/types/index";

export const MAX_LEGACY_PROCESSES = Number(process.env.MAX_LEGACY_PROCESSES) || 20;

export const selectServersForLegacyFallback = (
  working: ServerConfig[],
  maxProcesses: number = MAX_LEGACY_PROCESSES
): { toStart: ServerConfig[]; skipped: ServerConfig[] } => {
  if (working.length <= maxProcesses) {
    return { toStart: working, skipped: [] };
  }
  return { toStart: working.slice(0, maxProcesses), skipped: working.slice(maxProcesses) };
};
