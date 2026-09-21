import dotenv from "dotenv";
import { getAllServerConfigs } from "@infrastructure/storage/serverConfigManager";
import { logger } from "@shared/utils/logger";
import { startServerProcess } from "./managers/processManager";
import { setupShutdownHandlers } from "./managers/shutdownManager";
import { startRenderLoop } from "./managers/renderManager";
import { initializeBanner } from "./managers/bannerManager";
import { cleanupServerStates } from "@shared/utils/serverStateManager";
import { syncAllActiveServersToQueue } from "@infrastructure/queue/serverQueueManager";
import { startServerQueueWorker } from "./workers/queueWorker";
import { MAX_LEGACY_PROCESSES, selectServersForLegacyFallback } from "./managers/legacyFallbackPolicy";
import { startHeartbeatFileLoop, startJobActivityWatchdog } from "./managers/heartbeatManager";
import type { ServerConfig } from "@shared/types/index";

dotenv.config({ quiet: true });

const isServerWorking = (config: ServerConfig): boolean => {
  const { guild } = config;

  if (guild?.enabled === false) return false;
  if (!config.createdByUserId) return false;

  return true;
};

const separateServers = (
  configs: ServerConfig[]
): { working: ServerConfig[]; notWorking: ServerConfig[] } => {
  return configs.reduce(
    (acc, config) => {
      if (isServerWorking(config)) {
        return {
          ...acc,
          working: [...acc.working, config],
        };
      }

      return {
        ...acc,
        notWorking: [...acc.notWorking, config],
      };
    },
    { working: [], notWorking: [] } as {
      working: ServerConfig[];
      notWorking: ServerConfig[];
    }
  );
};

const startWorkingServers = (servers: ServerConfig[]): void => {
  servers.forEach(({ serverId }) => {
    try {
      startServerProcess(serverId);
    } catch (error) {
      logger.error(`Erro ao iniciar processo para ${serverId}:`, error);
    }
  });
};

const initialize = async (): Promise<void> => {
  const serverConfigs = await getAllServerConfigs();

  if (serverConfigs.length === 0) {
    console.log("Nenhum servidor configurado ainda — aguardando o primeiro servidor ser adicionado.");
  }

  const activeIds = serverConfigs.map((server) => server.serverId);
  await cleanupServerStates(activeIds);

  await initializeBanner(serverConfigs.length);
  setupShutdownHandlers();

  const { working } = separateServers(serverConfigs);

  let queueStarted = false;
  try {
    await syncAllActiveServersToQueue(serverConfigs);
    startServerQueueWorker();
    queueStarted = true;
  } catch (err: unknown) {
    console.warn("⚠️ [BullMQ] Erro ao sincronizar/iniciar fila Redis (verifique se Redis está rodando):", err);
  }

  if (!queueStarted) {
    const { toStart, skipped } = selectServersForLegacyFallback(working);
    if (skipped.length > 0) {
      console.error(
        `❌ Redis indisponível e ${working.length} servidores estão configurados — o modo de fallback (um processo por servidor) só é seguro até ${MAX_LEGACY_PROCESSES}. Monitorando apenas os primeiros ${MAX_LEGACY_PROCESSES}; os outros ${skipped.length} ficam sem monitoramento até o Redis voltar.`
      );
    }
    startWorkingServers(toStart);
  }

  startHeartbeatFileLoop(20000);
  if (queueStarted) {
    startJobActivityWatchdog(60000, 5 * 60000, () => working.length > 0);
  }

  startRenderLoop(2000, 1000);
};

try {
  await initialize();
} catch (error: unknown) {
  console.error("Erro fatal ao iniciar sistema:", error);
  process.exit(1);
}
