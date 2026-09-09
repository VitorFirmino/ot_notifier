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
import type { ServerConfig } from "@shared/types/index";

dotenv.config({ quiet: true });

const isServerWorking = (config: ServerConfig): boolean => {
  const { guild } = config;

  if (guild?.enabled === false) return false;

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
    console.error("Nenhum servidor configurado.");
    console.error("Adicione servidores em servers.json ou via: npm run manage");
    process.exit(1);
  }

  const activeIds = serverConfigs.map((server) => server.serverId);
  await cleanupServerStates(activeIds);

  await initializeBanner(serverConfigs.length);
  setupShutdownHandlers();

  let queueStarted = false;
  try {
    await syncAllActiveServersToQueue(serverConfigs);
    startServerQueueWorker();
    queueStarted = true;
  } catch (err: unknown) {
    console.warn("⚠️ [BullMQ] Erro ao sincronizar/iniciar fila Redis (verifique se Redis está rodando):", err);
  }

  if (!queueStarted) {
    const { working } = separateServers(serverConfigs);
    startWorkingServers(working);
  }

  startRenderLoop(2000, 1000);
};

try {
  await initialize();
} catch (error: unknown) {
  console.error("Erro fatal ao iniciar sistema:", error);
  process.exit(1);
}
