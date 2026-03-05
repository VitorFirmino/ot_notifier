import { loadServerConfig } from "@infrastructure/storage/serverConfigManager";
import {
  updateServerState,
  getAllServerStates,
  clearProcessingState,
  clearVerifyingState,
  clearNextCheckState,
} from "@shared/utils/serverStateManager";
import { processServerCheck } from "./serverCheckHandler";
import { loadPlaywrightManager } from "../utils/playwrightLoader";
import { DEFAULT_CHECK_INTERVAL, parsePositiveInt } from "../utils/constants";
import { sleep } from "../utils/sleep";

let shouldStopLoop = false;

const getBaseCheckInterval = (
  settings?: { checkInterval?: number }
): number =>
  settings?.checkInterval ??
  parsePositiveInt(process.env.CHECK_INTERVAL, DEFAULT_CHECK_INTERVAL);

const getIdleCheckInterval = (
  settings?: { idleCheckInterval?: number }
): number =>
  settings?.idleCheckInterval ??
  parsePositiveInt(process.env.CHECK_INTERVAL_IDLE, 15 * 60 * 1000);

const getEmptyGuildCheckInterval = (
  settings?: { emptyGuildCheckInterval?: number }
): number =>
  settings?.emptyGuildCheckInterval ??
  parsePositiveInt(process.env.CHECK_INTERVAL_EMPTY_GUILD, 30 * 60 * 1000);

const getProtectedCheckInterval = (
  settings?: { protectedCheckInterval?: number }
): number =>
  settings?.protectedCheckInterval ??
  parsePositiveInt(process.env.CHECK_INTERVAL_PROTECTED, 10 * 60 * 1000);

const getEffectiveCheckInterval = (
  serverId: string,
  settings?: {
    checkInterval?: number;
    idleCheckInterval?: number;
    emptyGuildCheckInterval?: number;
    protectedCheckInterval?: number;
  }
): number => {
  const baseInterval = getBaseCheckInterval(settings);
  const states = getAllServerStates();
  const online = states[serverId]?.finished?.online;
  const warnMessage = states[serverId]?.warn?.message?.toLowerCase() || "";

  if (warnMessage.includes("nenhum membro") || warnMessage.includes("sem jogadores")) {
    return Math.max(baseInterval, getEmptyGuildCheckInterval(settings));
  }

  if (warnMessage.includes("cloudflare") || warnMessage.includes("anti-bot") || warnMessage.includes("proteção") || warnMessage.includes("protegido")) {
    return Math.max(baseInterval, getProtectedCheckInterval(settings));
  }

  if (online === 0) {
    return Math.max(baseInterval, getIdleCheckInterval(settings));
  }

  return baseInterval;
};

export const runServerLoop = async (): Promise<void> => {
  const serverId = process.argv[2] || process.env.SERVER_ID;

  if (!serverId) {
    process.exit(1);
  }

  const serverConfig = loadServerConfig(serverId);
  if (serverConfig) {
    await updateServerState(serverId, {
      name: serverConfig.serverName,
    });
    await clearProcessingState(serverId);
    await clearVerifyingState(serverId);
    await clearNextCheckState(serverId);
  }

  let isProcessing = false;
  let lastCheckTime = 0;

  const runLoop = async (): Promise<void> => {
    while (!shouldStopLoop) {
      const currentConfig = loadServerConfig(serverId);
      if (!currentConfig) {
        await sleep(5000);
        continue;
      }

      const checkInterval = getEffectiveCheckInterval(serverId, currentConfig.settings);

      if (isProcessing) {
        await sleep(1000);
        continue;
      }

      const now = Date.now();
      if (lastCheckTime > 0) {
        const timeSinceLastCheck = now - lastCheckTime;
        if (timeSinceLastCheck < checkInterval) {
          const waitTime = checkInterval - timeSinceLastCheck;
          await sleep(waitTime);
          continue;
        }
      }

      isProcessing = true;
      lastCheckTime = Date.now();

      try {
        await processServerCheck(serverId);
      } catch (error) {
        console.error(error);
      } finally {
        isProcessing = false;
      }

      if (shouldStopLoop) break;

      const effectiveIntervalAfterRun = getEffectiveCheckInterval(serverId, currentConfig.settings);
      const nextCheckTime = Date.now() + effectiveIntervalAfterRun;
      await updateServerState(serverId, {
        nextCheck: {
          timestamp: nextCheckTime,
          checkInterval: effectiveIntervalAfterRun,
        },
      });

      const sleepStart = Date.now();
      while (Date.now() - sleepStart < effectiveIntervalAfterRun && !shouldStopLoop) {
        const remaining = effectiveIntervalAfterRun - (Date.now() - sleepStart);
        const nextCheck = Date.now() + remaining;
        await updateServerState(serverId, {
          nextCheck: {
            timestamp: nextCheck,
            checkInterval: effectiveIntervalAfterRun,
          },
        }).catch(() => undefined);

        await sleep(1000);
      }
    }
  };

  await runLoop();
};

let shutdownInProgress = false;

export const gracefulShutdown = async (_signal: string): Promise<void> => {
  if (shutdownInProgress) {
    process.exit(0);
    return;
  }

  shutdownInProgress = true;
  shouldStopLoop = true;

  const serverId = process.argv[2] || process.env.SERVER_ID;
  if (serverId) {
    const manager = await loadPlaywrightManager();
    if (manager) {
      try {
        await manager.closeBrowser(serverId);
      } catch (error) {
        console.error(error);
      }
    }
  }

  setTimeout(() => {
    process.exit(0);
  }, 1000);
};
