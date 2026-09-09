import { Redis, type RedisOptions } from "ioredis";

export const getRedisOptions = (): RedisOptions => {
  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = parseInt(process.env.REDIS_PORT || "6379", 10);
  const password = process.env.REDIS_PASSWORD || undefined;
  const db = parseInt(process.env.REDIS_DB || "0", 10);

  return {
    host,
    port,
    password,
    db,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
  };
};

export const createRedisConnection = (): Redis => {
  const options = getRedisOptions();
  const redis = new Redis(options);

  redis.on("error", (err: unknown) => {
    console.warn("⚠️ Conexão Redis falhou ou em tentativa de reconexão:", err);
  });

  redis.on("connect", () => {
    console.log("🔌 Conectado ao servidor Redis com sucesso.");
  });

  return redis;
};
