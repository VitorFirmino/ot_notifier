import { writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { logger } from "@shared/utils/logger";

const HEARTBEAT_DIR = process.env.SERVER_STORAGE_DIR
  ? resolve(process.env.SERVER_STORAGE_DIR, "runtime-state")
  : join(process.cwd(), "data");
const HEARTBEAT_FILE = join(HEARTBEAT_DIR, ".orchestrator-heartbeat");

try {
  mkdirSync(HEARTBEAT_DIR, { recursive: true });
} catch (err: unknown) {
  if ((err as { code?: string })?.code !== "EEXIST") {
    console.warn("Failed to create heartbeat directory:", err);
  }
}

export const writeHeartbeatFile = (): void => {
  try {
    writeFileSync(HEARTBEAT_FILE, new Date().toISOString(), "utf-8");
  } catch (err: unknown) {
    console.warn("Failed to write orchestrator heartbeat file:", err);
  }
};

export const startHeartbeatFileLoop = (intervalMs: number): NodeJS.Timeout => {
  writeHeartbeatFile();
  return setInterval(writeHeartbeatFile, intervalMs);
};

let lastJobActivityAt = Date.now();

export const recordJobActivity = (): void => {
  lastJobActivityAt = Date.now();
};

export const startJobActivityWatchdog = (
  checkIntervalMs: number,
  staleThresholdMs: number,
  hasWorkingServers: () => boolean
): NodeJS.Timeout => {
  lastJobActivityAt = Date.now();

  return setInterval(() => {
    if (!hasWorkingServers()) return;

    const staleSinceMs = Date.now() - lastJobActivityAt;
    if (staleSinceMs < staleThresholdMs) return;

    logger.error(
      `🚨 Watchdog: nenhuma verificação de servidor foi concluída nos últimos ${Math.round(
        staleSinceMs / 1000
      )}s. Encerrando processo para forçar reinício (restart: unless-stopped).`
    );
    process.exit(1);
  }, checkIntervalMs);
};
