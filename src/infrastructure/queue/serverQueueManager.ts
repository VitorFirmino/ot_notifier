import { Queue } from "bullmq";
import { getRedisOptions } from "./redisConnection";
import type { ServerConfig } from "@shared/types/index";

export const QUEUE_NAME = "serverCheckQueue";

export const DOWN_RETRY_INTERVAL_MS = (() => {
  const parsed = Number.parseInt(process.env.CHECK_INTERVAL_IDLE ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15 * 60 * 1000;
})();

let serverCheckQueueInstance: Queue | null = null;

export const getServerCheckQueue = (): Queue => {
  if (!serverCheckQueueInstance) {
    serverCheckQueueInstance = new Queue(QUEUE_NAME, {
      connection: getRedisOptions() as any,
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
  intervalMs: number = 120000
): Promise<void> => {
  const queue = getServerCheckQueue();
  const schedulerId = `check-server:${serverId}`;

  try {
    if (typeof (queue as any).upsertJobScheduler === "function") {
      await (queue as any).upsertJobScheduler(
        schedulerId,
        { every: Math.max(10000, intervalMs) },
        { name: schedulerId, data: { serverId } }
      );
    } else {
      await queue.add(
        schedulerId,
        { serverId },
        {
          jobId: schedulerId,
          repeat: {
            every: Math.max(10000, intervalMs),
          },
        } as any
      );
    }

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
    if (typeof (queue as any).removeJobScheduler === "function") {
      await (queue as any).removeJobScheduler(schedulerId);
    } else if (typeof (queue as any).getRepeatableJobs === "function") {
      const repeatableJobs = await (queue as any).getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.name === schedulerId || job.id === schedulerId) {
          await (queue as any).removeRepeatableByKey(job.key);
        }
      }
    }
    console.log(`🗑️ [BullMQ] Agendamento removido para ${serverId}`);
  } catch (err: unknown) {
    console.warn(`⚠️ [BullMQ] Erro ao remover agendamento de ${serverId}:`, err);
  }
};

export const triggerServerCheckNow = async (serverId: string): Promise<void> => {
  const queue = getServerCheckQueue();
  const jobName = `trigger-now:${serverId}:${Date.now()}`;

  try {
    await queue.add(
      `check-server:${serverId}`,
      { serverId, isManualTrigger: true },
      { jobId: jobName }
    );
    console.log(`🚀 [BullMQ] Disparo manual de verificação enviado para ${serverId}`);
  } catch (err: unknown) {
    console.warn(`⚠️ [BullMQ] Erro ao disparar verificação manual para ${serverId}:`, err);
  }
};

export const syncAllActiveServersToQueue = async (configs: ServerConfig[]): Promise<void> => {
  try {
    for (const config of configs) {
      if (config.guild.enabled !== false && config.isWorking !== false) {
        const interval = config.settings?.checkInterval || 120000;
        await addOrUpdateServerSchedule(config.serverId, interval);
      } else {
        await removeServerSchedule(config.serverId);
      }
    }
  } catch (err: unknown) {
    console.warn("⚠️ [BullMQ] Erro ao sincronizar servidores ativos na fila:", err);
  }
};
