import { Queue, type ConnectionOptions } from "bullmq";
import { getRedisOptions } from "./redisConnection";
import { resolveCheckInterval } from "@application/workers/utils/constants";
import type { ServerConfig } from "@shared/types/index";

export const QUEUE_NAME = "serverCheckQueue";

const REDIS_OPERATION_TIMEOUT_MS = 5000;

const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Operação no Redis excedeu o tempo limite.")), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

export const DOWN_RETRY_INTERVAL_MS = (() => {
  const parsed = Number.parseInt(process.env.CHECK_INTERVAL_IDLE ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15 * 60 * 1000;
})();

let serverCheckQueueInstance: Queue | null = null;

export const getServerCheckQueue = (): Queue => {
  if (!serverCheckQueueInstance) {
    serverCheckQueueInstance = new Queue(QUEUE_NAME, {
      connection: getRedisOptions() as unknown as ConnectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
      },
    });
  }
  return serverCheckQueueInstance;
};

export const addOrUpdateServerSchedule = async (
  serverId: string,
  intervalMs: number = resolveCheckInterval()
): Promise<void> => {
  const queue = getServerCheckQueue();
  const schedulerId = `check-server:${serverId}`;

  try {
    await withTimeout(
      queue.upsertJobScheduler(
        schedulerId,
        { every: Math.max(10000, intervalMs) },
        { name: schedulerId, data: { serverId } }
      ),
      REDIS_OPERATION_TIMEOUT_MS
    );

    console.log(`⏰ [BullMQ] Job repetível agendado para ${serverId} a cada ${intervalMs / 1000}s`);
  } catch (err: unknown) {
    console.warn(`⚠️ [BullMQ] Erro ao agendar servidor ${serverId}:`, err);
  }
};

export const scheduleServerRetry = async (serverId: string): Promise<void> => {
  await addOrUpdateServerSchedule(serverId, DOWN_RETRY_INTERVAL_MS);
};

export const removeServerSchedule = async (serverId: string): Promise<void> => {
  const queue = getServerCheckQueue();
  const schedulerId = `check-server:${serverId}`;

  try {
    await withTimeout(queue.removeJobScheduler(schedulerId), REDIS_OPERATION_TIMEOUT_MS);
    console.log(`🗑️ [BullMQ] Agendamento removido para ${serverId}`);
  } catch (err: unknown) {
    console.warn(`⚠️ [BullMQ] Erro ao remover agendamento de ${serverId}:`, err);
  }
};

export const triggerServerCheckNow = async (serverId: string): Promise<void> => {
  const queue = getServerCheckQueue();
  const jobName = `trigger-now:${serverId}:${Date.now()}`;

  try {
    await withTimeout(
      queue.add(`check-server:${serverId}`, { serverId, isManualTrigger: true }, { jobId: jobName }),
      REDIS_OPERATION_TIMEOUT_MS
    );
    console.log(`🚀 [BullMQ] Disparo manual de verificação enviado para ${serverId}`);
  } catch (err: unknown) {
    console.warn(`⚠️ [BullMQ] Erro ao disparar verificação manual para ${serverId}:`, err);
  }
};

const isSchedulable = (config: ServerConfig): boolean => {
  const activeFlags = [config.guild.enabled !== false, config.isWorking !== false];
  return activeFlags.every(Boolean) && Boolean(config.createdByUserId);
};

export const syncAllActiveServersToQueue = async (configs: ServerConfig[]): Promise<void> => {
  const unowned = configs.filter((config) => !config.createdByUserId).map((config) => config.serverId);
  if (unowned.length > 0) {
    console.warn(
      `⚠️ [BullMQ] ${unowned.length} servidor(es) sem dono não serão monitorados: ${unowned.join(", ")}`
    );
  }

  try {
    for (const config of configs) {
      if (isSchedulable(config)) {
        await addOrUpdateServerSchedule(config.serverId, resolveCheckInterval(config.settings));
      } else {
        await removeServerSchedule(config.serverId);
      }
    }
  } catch (err: unknown) {
    console.warn("⚠️ [BullMQ] Erro ao sincronizar servidores ativos na fila:", err);
  }
};
