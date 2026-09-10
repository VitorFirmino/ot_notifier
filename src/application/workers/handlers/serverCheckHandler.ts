import {
  loadServerConfig,
  updateServerCharacters,
  updateServerWorkingStatus,
} from "@infrastructure/storage/serverConfigManager";
import {
  updateServerState,
  clearProcessingState,
  clearVerifyingState,
} from "@shared/utils/serverStateManager";
import {
  fetchAndProcessCharactersWithProgress,
  processCharacterResults,
} from "./characterProcessor";
import { getWebhookUrl } from "../utils/webhookUtils";
import { recordEvent } from "@infrastructure/events/eventLog";
import {
  DEFAULT_CHECK_INTERVAL,
  DEFAULT_CONCURRENCY,
  DEFAULT_REQUEST_DELAY,
  parsePositiveInt,
} from "../utils/constants";
import { serverHasCloudflare } from "@infrastructure/scraping/utils/cloudflareDetector";
import { fetchOnlineCharacterNames } from "@infrastructure/scraping/utils/onlinePlayersDiscovery";
import type { CharacterInfo, ProcessCharacterResult } from "@shared/types/index";

const getNormalCheckInterval = (settings?: { checkInterval?: number }): number =>
  settings?.checkInterval ?? parsePositiveInt(process.env.CHECK_INTERVAL, DEFAULT_CHECK_INTERVAL);

const serversInProgress = new Set<string>();

const syncScheduleForWorkingStatus = async (
  serverId: string,
  isWorking: boolean,
  settings?: { checkInterval?: number }
): Promise<void> => {
  try {
    const { addOrUpdateServerSchedule, scheduleServerRetry } = await import(
      "@infrastructure/queue/serverQueueManager"
    );
    if (isWorking) {
      await addOrUpdateServerSchedule(serverId, getNormalCheckInterval(settings));
    } else {
      await scheduleServerRetry(serverId);
    }
  } catch (err: unknown) {
    console.warn(`⚠️ [${serverId}] Falha ao reagendar verificação no BullMQ:`, err);
  }
};

const toLowerMessage = (error: unknown): string =>
  error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

const isAntiBotError = (error: unknown): boolean => {
  const message = toLowerMessage(error);

  const antiBotIndicators = [
    "403/proteção anti-bot",
    "proteção anti-bot",
    "acesso negado (403)",
    "status 403",
    "forbidden",
    "cloudflare",
    "cf-ray",
    "cf-challenge",
    "just a moment",
    "challenge",
  ];

  return antiBotIndicators.some((indicator) => message.includes(indicator));
};

const isProtectedError = (error: unknown, knownCloudflare: boolean): boolean =>
  knownCloudflare || isAntiBotError(error);

const isServerDownError = (error: unknown): boolean => {
  if (isAntiBotError(error)) {
    return false;
  }

  const message = toLowerMessage(error);

  const downIndicators = [
    "enotfound",
    "econnrefused",
    "econnreset",
    "etimedout",
    "timeout",
    "network error",
    "socket hang up",
    "502",
    "503",
    "504",
    "parse error",
    "fatal error",
    "syntax error",
    "unexpected '--'",
    "doesn't exist",
    "does not exist",
    "não encontrada",
    "não existe",
  ];

  return downIndicators.some((indicator) => message.includes(indicator));
};

const WARN_MESSAGES = {
  EMPTY_GUILD: "Sem jogadores encontrados na guild neste momento.",
  PROTECTED: "Servidor protegido por segurança do site (Cloudflare).",
  DOWN: "Servidor indisponível no momento.",
  TEMP_ERROR: "Atualização indisponível no momento.",
} as const;

const buildWarnState = (message: string): { message: string; timestamp: number } => ({
  message,
  timestamp: Date.now(),
});

const classifyCheckFailure = (isAntiBot: boolean, isDown: boolean): string =>
  isAntiBot ? WARN_MESSAGES.PROTECTED : isDown ? WARN_MESSAGES.DOWN : WARN_MESSAGES.TEMP_ERROR;

const withTimeout = async <T>(
  operation: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
};

export const processServerCheck = async (serverId: string): Promise<void> => {
  if (serversInProgress.has(serverId)) {
    console.log(`⏭️ [${serverId}] Verificação já em andamento, pulando execução sobreposta.`);
    return;
  }
  serversInProgress.add(serverId);

  const startTime = Date.now();

  try {
    const serverConfig = loadServerConfig(serverId);

    if (!serverConfig) {
      return;
    }

    const { serverName, guild, characters, settings } = serverConfig;
    const knownCloudflareProtection = serverHasCloudflare(serverId);

    await updateServerState(serverId, {
      name: serverName,
      warn: undefined,
    });

    const defaultConcurrency = parsePositiveInt(process.env.CONCURRENCY, DEFAULT_CONCURRENCY);
    const concurrency = Math.max(1, settings?.concurrency ?? defaultConcurrency);
    const requestDelay = settings?.requestDelay ?? DEFAULT_REQUEST_DELAY;
    const batchSize = settings?.batchSize ?? 10;

    if (guild.enabled === false) {
      await updateServerState(serverId, {
        name: serverName,
        warn: buildWarnState("Guild desabilitada"),
      });
      return;
    }

    let totalCharacters = Object.keys(characters).length;

    if (guild?.url) {
      console.log(
        `🔄 [${serverId}] Sincronizando e verificando guild (${guild.url})...`
      );

      try {
        const { getGuildMembers } = await import("@infrastructure/scraping/parsers/guildParser");
        const members = await getGuildMembers(guild.url, settings?.headers);

        if (members.length === 0) {
          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          await updateServerWorkingStatus(serverId, true);
          await syncScheduleForWorkingStatus(serverId, true, settings);
          await updateServerState(serverId, {
            name: serverName,
            finished: {
              online: 0,
              offline: 0,
              changes: 0,
              errors: 0,
              cached: 0,
              fetched: 0,
              saved: true,
              duration,
              timestamp: Date.now(),
            },
            warn: buildWarnState(WARN_MESSAGES.EMPTY_GUILD),
          });
          return;
        }

        const hadExistingCharacters = Object.keys(characters).length > 0;
        const newMemberNames: string[] = [];
        const updatedCharMap: Record<string, CharacterInfo> = {};
        for (const { name, url } of members) {
          const existing = characters[name];
          if (!existing) newMemberNames.push(name);
          updatedCharMap[name] = {
            url,
            last_level: existing?.last_level ?? null,
            up_streak: existing?.up_streak ?? 0,
            last_milestone: existing?.last_milestone ?? 0,
            last_death: existing?.last_death ?? null,
            isOnline: existing?.isOnline,
          };
        }

        await updateServerCharacters(serverId, updatedCharMap);
        console.log(`✅ [${serverId}] ${members.length} personagens sincronizados da guild`);

        if (hadExistingCharacters && newMemberNames.length > 0) {
          await recordEvent({
            id: `evt-${Date.now()}-guild-sync`,
            timestamp: new Date().toISOString(),
            serverId,
            serverName,
            type: "guild_sync",
            details: `Sincronização de guild concluída: ${newMemberNames.length} novo(s) membro(s) encontrado(s)`,
            webhookSent: false,
          });
        }

        const updatedConfig = loadServerConfig(serverId);
        if (updatedConfig) {
          Object.assign(characters, updatedConfig.characters);
        }
        totalCharacters = Object.keys(characters).length;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
        const isAntiBot = isProtectedError(error, knownCloudflareProtection);
        const isDown = isServerDownError(error);
        if (isAntiBot) {
          await updateServerWorkingStatus(serverId, true);
          await syncScheduleForWorkingStatus(serverId, true, settings);
        } else if (isDown) {
          await updateServerWorkingStatus(serverId, false);
          await syncScheduleForWorkingStatus(serverId, false, settings);
        }
        console.warn(`⚠️ [${serverId}] Erro ao sincronizar guild: ${errorMsg}`);
        await updateServerState(serverId, {
          name: serverName,
          warn: buildWarnState(classifyCheckFailure(isAntiBot, isDown)),
        });
        return;
      }
    }

    if (Object.keys(characters).length === 0) {
      await updateServerState(serverId, {
        name: serverName,
        warn: buildWarnState("Nenhum personagem para monitorar"),
      });
      return;
    }

    const eligibleEntries = Object.entries(characters).filter(([, char]) => {
      if (char.last_level === null) return true;
      return char.last_level !== undefined && char.last_level > 0;
    });

    const onlineNames = guild?.url
      ? await fetchOnlineCharacterNames(guild.url, settings?.headers).catch(() => null)
      : null;

    let charactersToProcess: Record<string, CharacterInfo> = Object.fromEntries(eligibleEntries);
    const syntheticOfflineResults: ProcessCharacterResult[] = [];

    if (onlineNames) {
      const onlineEntries: Record<string, CharacterInfo> = {};
      for (const [name, info] of eligibleEntries) {
        if (onlineNames.has(name)) {
          onlineEntries[name] = info;
        } else if (info.last_level !== null) {
          syntheticOfflineResults.push({
            name,
            level: info.last_level,
            isOnline: false,
            lastDeath: info.last_death ?? null,
          });
        }
      }
      charactersToProcess = onlineEntries;
      console.log(
        `🟢 [${serverId}] ${onlineNames.size} online no servidor, ${Object.keys(onlineEntries).length} são da guild — pulando fetch individual de ${syntheticOfflineResults.length} offline`
      );
    }

    const totalToProcess = Object.keys(charactersToProcess).length;
    const hasTrackedCharacters = Object.values(charactersToProcess).some(
      (char) => char.last_level !== null && char.last_level > 0
    );

    if (totalToProcess === 0 && syntheticOfflineResults.length === 0) {
      console.log(`⏭️  [${serverId}] Nenhum personagem elegível para processar (0/${totalCharacters})`);
      return;
    }

    let webhookUrl = "";
    if (hasTrackedCharacters) {
      webhookUrl = getWebhookUrl(serverConfig);
    } else {

      try {
        webhookUrl = getWebhookUrl(serverConfig);
      } catch (err: unknown) {
        webhookUrl = "";
      }
    }

    const isInitialSync = !hasTrackedCharacters;
    const processLabel = hasTrackedCharacters
      ? `▶️  [${serverId}] Processando ${totalToProcess}/${totalCharacters} personagens`
      : `🌱 [${serverId}] Carregando nível inicial de ${totalToProcess}/${totalCharacters} personagens`;
    console.log(processLabel);

    await updateServerState(serverId, {
      name: serverName,
      processing: {
        totalCharacters: totalToProcess,
        processed: 0,
        startTime: startTime,
        isInitialSync,
      },
    });

    let processStats = { cached: 0, fetched: 0 };
    let processedCount = 0;
    let lastUpdateTime = 0;
    let pendingUpdate: NodeJS.Timeout | null = null;
    let progressCancelled = false;
    const UPDATE_THROTTLE_MS = 200;

    const doUpdate = (processed: number): void => {
      if (progressCancelled) return;
      updateServerState(serverId, {
        name: serverName,
        processing: {
          totalCharacters: totalToProcess,
          processed,
          startTime: startTime,
          isInitialSync,
        },
      }).catch((err: unknown) => {
        console.warn(`[${serverId}] Failed to update processing state:`, err);
      });
    };

    const onProgress = (processed: number, _total: number): void => {
      processedCount = processed;
      const now = Date.now();

      if (now - lastUpdateTime >= UPDATE_THROTTLE_MS) {
        lastUpdateTime = now;
        doUpdate(processed);

        if (pendingUpdate) {
          clearTimeout(pendingUpdate);
          pendingUpdate = null;
        }
      } else {
        if (!pendingUpdate) {
          const delay = UPDATE_THROTTLE_MS - (now - lastUpdateTime);
          pendingUpdate = setTimeout(() => {
            lastUpdateTime = Date.now();
            doUpdate(processedCount);
            pendingUpdate = null;
          }, delay);
        }
      }
    };

    try {
      const scaledTimeoutMs = Math.max(120000, totalToProcess * 3000);
      const checkTimeoutMs = parsePositiveInt(process.env.SERVER_CHECK_TIMEOUT_MS, scaledTimeoutMs);
      const processResult = await withTimeout(
        fetchAndProcessCharactersWithProgress(
          charactersToProcess,
          concurrency,
          requestDelay,
          settings?.headers,
          batchSize,
          serverId,
          onProgress
        ),
        checkTimeoutMs,
        `timeout: servidor sem resposta em ${Math.round(checkTimeoutMs / 1000)}s`
      );
      processStats = processResult.stats;

      if (pendingUpdate) {
        clearTimeout(pendingUpdate);
        pendingUpdate = null;
      }
      progressCancelled = true;

      await clearProcessingState(serverId);
      const verifyStartTime = Date.now();

      await updateServerState(serverId, {
        name: serverName,
        verifying: {
          totalCharacters: totalToProcess,
          processed: processedCount,
          startTime: verifyStartTime,
          elapsed: 0,
        },
      });

      const updateInterval = setInterval(async () => {
        const elapsed = (Date.now() - verifyStartTime) / 1000;
        await updateServerState(serverId, {
          name: serverName,
          verifying: {
            totalCharacters: totalToProcess,
            processed: processedCount,
            startTime: verifyStartTime,
            elapsed,
          },
        });
      }, 1000);

      const verifyTimeoutMs = parsePositiveInt(process.env.VERIFY_TIMEOUT_MS, 60000);
      try {
        const { updatedCharacters, stats } = await withTimeout(
          processCharacterResults({
            webhookUrl,
            serverId,
            serverName,
            results: [...processResult.results, ...syntheticOfflineResults],
            characters,
          }),
          verifyTimeoutMs,
          `verificação pausada: mais de ${Math.round(verifyTimeoutMs / 1000)}s sem resposta do webhook`
        );

        let saved = false;
        try {
          saved = await updateServerCharacters(serverId, updatedCharacters);
        } catch (err: unknown) {
          console.warn(`[${serverId}] Error persisting character updates:`, err);
          saved = false;
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        clearInterval(updateInterval);

        const serverConfig = loadServerConfig(serverId);
        const checkInterval =
          serverConfig?.settings?.checkInterval ??
          parseInt(process.env.CHECK_INTERVAL ?? "300000", 10);
        const nextCheckTime = Date.now() + checkInterval;

        await updateServerState(serverId, {
          name: serverName,
          finished: {
            online: stats.online,
            offline: stats.offline,
            changes: stats.levelChanged,
            errors: stats.errors,
            cached: processStats.cached,
            fetched: processStats.fetched,
            saved,
            duration,
            timestamp: Date.now(),
          },
          nextCheck: {
            timestamp: nextCheckTime,
            checkInterval,
          },
        });

        const allFetchesFailed = totalToProcess > 0 && stats.errors >= totalToProcess;
        const allUnknownLevels =
          totalToProcess > 0 &&
          processResult.results.length > 0 &&
          processResult.results.every((result) => !!result.error || result.level === null);
        const erroredResults = processResult.results.filter((result) => !!result.error);
        const allErrorsAreAntiBot =
          erroredResults.length > 0 &&
          erroredResults.length >= totalToProcess &&
          erroredResults.every((result) =>
            isProtectedError(result.error || "", knownCloudflareProtection)
          );
        const shouldMarkServerDown =
          (allFetchesFailed || allUnknownLevels) && !allErrorsAreAntiBot;

        if (shouldMarkServerDown) {
          await updateServerWorkingStatus(serverId, false);
          await syncScheduleForWorkingStatus(serverId, false, settings);
          await updateServerState(serverId, {
            name: serverName,
            warn: buildWarnState(WARN_MESSAGES.DOWN),
          });
        } else if (allErrorsAreAntiBot) {
          await updateServerWorkingStatus(serverId, true);
          await syncScheduleForWorkingStatus(serverId, true, settings);
          await updateServerState(serverId, {
            name: serverName,
            warn: buildWarnState(WARN_MESSAGES.PROTECTED),
          });
        } else {
          await updateServerWorkingStatus(serverId, true);
          await syncScheduleForWorkingStatus(serverId, true, settings);
        }
      } finally {
        clearInterval(updateInterval);
        await clearVerifyingState(serverId);
      }
    } catch (error) {
      progressCancelled = true;
      if (pendingUpdate) {
        clearTimeout(pendingUpdate);
        pendingUpdate = null;
      }
      const isAntiBot = isProtectedError(error, knownCloudflareProtection);

      const allProcessed = processedCount >= totalToProcess && totalToProcess > 0;
      const isDown = !allProcessed && isServerDownError(error);
      if (isAntiBot) {
        await updateServerWorkingStatus(serverId, true);
        await syncScheduleForWorkingStatus(serverId, true, settings);
      } else if (isDown) {
        await updateServerWorkingStatus(serverId, false);
        await syncScheduleForWorkingStatus(serverId, false, settings);
      }
      await clearProcessingState(serverId);
      await updateServerState(serverId, {
        name: serverName,
        warn: buildWarnState(classifyCheckFailure(isAntiBot, isDown)),
      });
      return;
    }
  } catch (error) {
    const serverConfig = loadServerConfig(serverId);
    const isAntiBot = isProtectedError(error, serverHasCloudflare(serverId));
    const isDown = isServerDownError(error);
    if (isAntiBot) {
      await updateServerWorkingStatus(serverId, true);
      await syncScheduleForWorkingStatus(serverId, true, serverConfig?.settings);
    } else if (isDown) {
      await updateServerWorkingStatus(serverId, false);
      await syncScheduleForWorkingStatus(serverId, false, serverConfig?.settings);
    }
    await updateServerState(serverId, {
      name: serverConfig?.serverName || serverId,
      warn: buildWarnState(classifyCheckFailure(isAntiBot, isDown)),
    });
    throw error;
  } finally {
    serversInProgress.delete(serverId);
  }
};
