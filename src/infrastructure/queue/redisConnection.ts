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

const CACHE_READY_TIMEOUT_MS = 2000;

let cacheClient: Redis | null = null;
let cacheConnecting: Promise<void> | null = null;

const createCacheConnection = (): Redis => {
  const redis = new Redis({
    ...getRedisOptions(),
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });

  let alreadyWarned = false;

  redis.on("error", (err: unknown) => {
    if (alreadyWarned) return;
    alreadyWarned = true;
    console.warn("⚠️ Redis de cache indisponível, seguindo sem cache:", err);
  });

  redis.on("connect", () => {
    alreadyWarned = false;
  });

  return redis;
};

const waitForCacheReady = (redis: Redis): Promise<void> =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, CACHE_READY_TIMEOUT_MS);
    const settle = (): void => {
      clearTimeout(timer);
      resolve();
    };

    redis.once("ready", settle);
    redis.once("error", settle);
  });

export const getCacheRedisClient = async (): Promise<Redis | null> => {
  if (!cacheClient) {
    try {
      cacheClient = createCacheConnection();
    } catch (err: unknown) {
      console.warn("⚠️ Redis de cache indisponível, seguindo sem cache:", err);
      return null;
    }
    cacheConnecting = waitForCacheReady(cacheClient);
  }

  if (cacheConnecting) {
    await cacheConnecting;
    cacheConnecting = null;
  }

  return cacheClient;
};

export const closeCacheRedisClient = async (): Promise<void> => {
  if (!cacheClient) return;
  await cacheClient.quit().catch(() => undefined);
  cacheClient = null;
  cacheConnecting = null;
};
