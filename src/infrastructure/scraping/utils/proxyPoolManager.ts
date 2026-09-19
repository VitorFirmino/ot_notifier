import axios from "axios";
import type { Redis } from "ioredis";
import { createRedisConnection } from "@infrastructure/queue/redisConnection";

const POOL_KEY = "proxy_pool:entries";
const PIN_KEY_PREFIX = "proxy_pin:";
const HEALTH_CHECK_URL = "http://api.ipify.org?format=json";
const HEALTH_CHECK_TIMEOUT_MS = 12000;
const MAX_CANDIDATES_PER_ACQUIRE = 5;
const DEFAULT_PIN_TTL_SECONDS = 1500;

export type PoolProxy = {
  host: string;
  port: number;
  exitIp: string;
};

let client: Redis | null = null;
let clientUnavailable = false;
let localPool: string[] = [];

const getClient = (): Redis | null => {
  if (clientUnavailable) return null;
  if (client) return client;

  try {
    client = createRedisConnection();
    return client;
  } catch {
    clientUnavailable = true;
    return null;
  }
};

export const isProxyPoolEnabled = (): boolean => Boolean(process.env.SCRAPING_PROXY_EXTRACTION_URL);

const getPinTtlSeconds = (): number =>
  parseInt(process.env.PROXY_PIN_TTL_SECONDS || String(DEFAULT_PIN_TTL_SECONDS), 10);

const parseEntry = (entry: string): PoolProxy | null => {
  const [host, rawPort] = entry.split(":");
  const port = Number(rawPort);
  if (!host || !Number.isFinite(port)) return null;
  return { host, port, exitIp: "" };
};

export const checkProxyAlive = async (host: string, port: number): Promise<string | null> => {
  try {
    const response = await axios.get<{ ip?: string }>(HEALTH_CHECK_URL, {
      proxy: { protocol: "http", host, port },
      timeout: HEALTH_CHECK_TIMEOUT_MS,
    });
    return response.data?.ip ?? null;
  } catch {
    return null;
  }
};

const refreshPool = async (): Promise<string[]> => {
  const extractionUrl = process.env.SCRAPING_PROXY_EXTRACTION_URL;
  if (!extractionUrl) return [];

  try {
    const response = await axios.get<string>(extractionUrl, {
      timeout: 20000,
      responseType: "text",
      transformResponse: (data: string) => data,
    });

    const entries = String(response.data)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^[\d.]+:\d+$/.test(line));

    if (entries.length === 0) {
      console.warn("[proxy-pool] Extração não retornou proxies utilizáveis:", String(response.data).slice(0, 200));
      return [];
    }

    localPool = entries;
    const redis = getClient();
    if (redis) {
      await redis
        .multi()
        .del(POOL_KEY)
        .rpush(POOL_KEY, ...entries)
        .expire(POOL_KEY, getPinTtlSeconds())
        .exec()
        .catch(() => undefined);
    }

    console.log(`[proxy-pool] ${entries.length} proxies extraídos.`);
    return entries;
  } catch (err: unknown) {
    console.warn("[proxy-pool] Falha ao extrair proxies:", err);
    return [];
  }
};

const takeCandidates = async (): Promise<string[]> => {
  const redis = getClient();

  if (redis) {
    const fromRedis = await redis.lrange(POOL_KEY, 0, -1).catch(() => [] as string[]);
    if (fromRedis.length > 0) return fromRedis;
  } else if (localPool.length > 0) {
    return localPool;
  }

  return refreshPool();
};

const readPin = async (domain: string): Promise<PoolProxy | null> => {
  const redis = getClient();
  if (!redis) return null;

  const raw = await redis.get(`${PIN_KEY_PREFIX}${domain}`).catch(() => null);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PoolProxy;
  } catch {
    return null;
  }
};

const writePin = async (domain: string, proxy: PoolProxy): Promise<void> => {
  const redis = getClient();
  if (!redis) return;

  await redis
    .set(`${PIN_KEY_PREFIX}${domain}`, JSON.stringify(proxy), "EX", getPinTtlSeconds())
    .catch(() => undefined);
};

export const releasePinnedProxy = async (domain: string): Promise<void> => {
  const redis = getClient();
  if (!redis) return;

  await redis.del(`${PIN_KEY_PREFIX}${domain}`).catch(() => undefined);
};

export const acquireProxyForDomain = async (domain: string): Promise<PoolProxy | null> => {
  if (!isProxyPoolEnabled()) return null;

  const pinned = await readPin(domain);
  if (pinned) {
    const exitIp = await checkProxyAlive(pinned.host, pinned.port);
    if (exitIp) return { ...pinned, exitIp };

    console.warn(`[proxy-pool] Proxy fixado de ${domain} expirou (${pinned.host}:${pinned.port}), buscando outro.`);
    await releasePinnedProxy(domain);
  }

  for (let round = 0; round < 2; round++) {
    const candidates = round === 0 ? await takeCandidates() : await refreshPool();

    for (const entry of candidates.slice(0, MAX_CANDIDATES_PER_ACQUIRE)) {
      const parsed = parseEntry(entry);
      if (!parsed) continue;

      const exitIp = await checkProxyAlive(parsed.host, parsed.port);
      if (!exitIp) continue;

      const proxy: PoolProxy = { ...parsed, exitIp };
      await writePin(domain, proxy);
      return proxy;
    }
  }

  console.warn(`[proxy-pool] Nenhum proxy vivo disponível para ${domain}.`);
  return null;
};

export const closeProxyPool = async (): Promise<void> => {
  if (!client) return;
  await client.quit().catch(() => undefined);
  client = null;
};
