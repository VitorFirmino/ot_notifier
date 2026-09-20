import { getCacheRedisClient, closeCacheRedisClient } from "@infrastructure/queue/redisConnection";

const CLEARANCE_KEY_PREFIX = "cf_clearance:";
const METRICS_KEY_PREFIX = "cf_clearance_metrics:";
const DEFAULT_TTL_SECONDS = 1500;

export type CachedClearance = {
  cfClearance: string;
  userAgent: string;
  proxySessionId: string | null;
  exitIp: string | null;
  solvedAt: number;
};

export type ClearanceMetrics = {
  hits: number;
  misses: number;
  solves: number;
  invalidations: number;
};

const getTtlSeconds = (): number =>
  parseInt(process.env.CF_CLEARANCE_TTL_SECONDS || String(DEFAULT_TTL_SECONDS), 10);

const bumpMetric = async (metric: keyof ClearanceMetrics): Promise<void> => {
  const redis = await getCacheRedisClient();
  if (!redis) return;

  await redis.incr(`${METRICS_KEY_PREFIX}${metric}`).catch(() => undefined);
};

export const getCachedClearance = async (domain: string): Promise<CachedClearance | null> => {
  const redis = await getCacheRedisClient();
  if (!redis) return null;

  try {
    const raw = await redis.get(`${CLEARANCE_KEY_PREFIX}${domain}`);
    if (!raw) {
      await bumpMetric("misses");
      return null;
    }

    await bumpMetric("hits");
    return JSON.parse(raw) as CachedClearance;
  } catch (err: unknown) {
    console.warn(`[clearance-cache] Falha ao ler cache de ${domain}:`, err);
    return null;
  }
};

export const saveClearance = async (domain: string, clearance: CachedClearance): Promise<void> => {
  const redis = await getCacheRedisClient();
  if (!redis) return;

  try {
    await redis.set(
      `${CLEARANCE_KEY_PREFIX}${domain}`,
      JSON.stringify(clearance),
      "EX",
      getTtlSeconds()
    );
    await bumpMetric("solves");
  } catch (err: unknown) {
    console.warn(`[clearance-cache] Falha ao gravar cache de ${domain}:`, err);
  }
};

export const invalidateClearance = async (domain: string): Promise<void> => {
  const redis = await getCacheRedisClient();
  if (!redis) return;

  try {
    await redis.del(`${CLEARANCE_KEY_PREFIX}${domain}`);
    await bumpMetric("invalidations");
  } catch (err: unknown) {
    console.warn(`[clearance-cache] Falha ao invalidar cache de ${domain}:`, err);
  }
};

export const getClearanceMetrics = async (): Promise<ClearanceMetrics> => {
  const redis = await getCacheRedisClient();
  const empty: ClearanceMetrics = { hits: 0, misses: 0, solves: 0, invalidations: 0 };
  if (!redis) return empty;

  try {
    const [hits, misses, solves, invalidations] = await redis.mget(
      `${METRICS_KEY_PREFIX}hits`,
      `${METRICS_KEY_PREFIX}misses`,
      `${METRICS_KEY_PREFIX}solves`,
      `${METRICS_KEY_PREFIX}invalidations`
    );

    return {
      hits: parseInt(hits || "0", 10),
      misses: parseInt(misses || "0", 10),
      solves: parseInt(solves || "0", 10),
      invalidations: parseInt(invalidations || "0", 10),
    };
  } catch {
    return empty;
  }
};

export const closeClearanceCache = async (): Promise<void> => {
  await closeCacheRedisClient();
};
