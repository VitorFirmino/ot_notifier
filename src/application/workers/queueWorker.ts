import { Worker, type Job } from "bullmq";
import { QUEUE_NAME } from "@infrastructure/queue/serverQueueManager";
import { getRedisOptions } from "@infrastructure/queue/redisConnection";
import { processServerCheck } from "./handlers/serverCheckHandler";

let workerInstance: Worker | null = null;

export const startServerQueueWorker = (): Worker => {
  if (workerInstance) {
    return workerInstance;
  }

  const concurrency = parseInt(process.env.CONCURRENCY || "3", 10);

  workerInstance = new Worker(
    QUEUE_NAME,
    async (job: Job<{ serverId: string; isManualTrigger?: boolean }>) => {
      const { serverId, isManualTrigger } = job.data;
      if (!serverId) {
        throw new Error("Job sem serverId válido");
      }

      console.log(
        `⚙️ [BullMQ Worker] Processando verificação do servidor ${serverId}${
          isManualTrigger ? " (Disparo Manual)" : ""
        }...`
      );

      try {
        await processServerCheck(serverId);
        console.log(`✅ [BullMQ Worker] Verificação de ${serverId} finalizada com sucesso.`);
      } catch (err: unknown) {
        console.warn(`⚠️ [BullMQ Worker] Erro ao processar ${serverId}:`, err);
        throw err;
      }
    },
    {
      connection: getRedisOptions() as any,
      concurrency: Math.max(1, concurrency),
    }
  );

  workerInstance.on("completed", (job: Job) => {
    console.log(`🎉 [BullMQ Worker] Job ${job.id} para ${job.data?.serverId} concluído.`);
  });

  workerInstance.on("failed", (job: Job | undefined, err: Error) => {
    console.warn(`❌ [BullMQ Worker] Job ${job?.id} falhou:`, err.message);
  });

  console.log(`⚙️ [BullMQ Worker] Inicializado com concorrência = ${concurrency}`);
  return workerInstance;
};

export const stopServerQueueWorker = async (): Promise<void> => {
  if (workerInstance) {
    try {
      await workerInstance.close();
      console.log("🛑 [BullMQ Worker] Finalizado com sucesso.");
    } catch (err: unknown) {
      console.warn("⚠️ [BullMQ Worker] Erro ao encerrar worker:", err);
    } finally {
      workerInstance = null;
    }
  }
};
