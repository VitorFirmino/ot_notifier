import axios from "axios";
import { createHash } from "crypto";
import { getCacheRedisClient, closeCacheRedisClient } from "@infrastructure/queue/redisConnection";
import { getAxiosProxyConfig, getProxyConfig } from "./proxyConfig";

const GENERATION_KEY_PREFIX = "proxy_session_gen:";
const NEEDS_PROXY_KEY_PREFIX = "proxy_needed:";
const HEALTH_CHECK_URL = "https://api.ipify.org?format=json";
const HEALTH_CHECK_TIMEOUT_MS = 12000;
const MAX_SESSION_ATTEMPTS = 3;
const PROXY_DOWN_COOLDOWN_MS = 5 * 60 * 1000;

export type ProxySession = {
  sessionId: string;
  exitIp: string;
};

let proxyUnavailableUntil = 0;
const localGenerations = new Map<string, number>();
const localNeedsProxy = new Set<string>();

const readGeneration = async (domain: string): Promise<number> => {
  const redis = await getCacheRedisClient();
  if (!redis) return localGenerations.get(domain) ?? 0;

  const raw = await redis.get(`${GENERATION_KEY_PREFIX}${domain}`).catch(() => null);
  return raw ? parseInt(raw, 10) || 0 : 0;
};

export const buildSessionId = (domain: string, generation: number): string =>
  createHash("sha1").update(`${domain}:${generation}`).digest("hex").slice(0, 10);

export const markDomainNeedsProxy = async (domain: string): Promise<void> => {
  const redis = await getCacheRedisClient();

  if (!redis) {
    localNeedsProxy.add(domain);
    return;
  }

  await redis.set(`${NEEDS_PROXY_KEY_PREFIX}${domain}`, "1").catch(() => undefined);
};

export const domainNeedsProxy = async (domain: string): Promise<boolean> => {
  const redis = await getCacheRedisClient();
  if (!redis) return localNeedsProxy.has(domain);

  const raw = await redis.get(`${NEEDS_PROXY_KEY_PREFIX}${domain}`).catch(() => null);
  return raw === "1";
};

export const releasePinnedProxy = async (domain: string): Promise<void> => {
  const redis = await getCacheRedisClient();

  if (!redis) {
    localGenerations.set(domain, (localGenerations.get(domain) ?? 0) + 1);
    return;
  }

  await redis.incr(`${GENERATION_KEY_PREFIX}${domain}`).catch(() => undefined);
};

export const checkSessionAlive = async (sessionId: string): Promise<string | null> => {
  const proxy = getAxiosProxyConfig(sessionId);
  if (!proxy) return null;

  try {
    const response = await axios.get<{ ip?: string }>(HEALTH_CHECK_URL, {
      proxy,
      timeout: HEALTH_CHECK_TIMEOUT_MS,
    });
    return response.data?.ip ?? null;
  } catch {
    return null;
  }
};

export const isProxyUnavailable = (): boolean => Date.now() < proxyUnavailableUntil;

export const getProxySessionIdForDomain = async (domain: string): Promise<string | null> => {
  if (!getProxyConfig()) return null;
  if (isProxyUnavailable()) return null;
  if (!(await domainNeedsProxy(domain))) return null;

  return buildSessionId(domain, await readGeneration(domain));
};

export const acquireProxyForDomain = async (domain: string): Promise<ProxySession | null> => {
  if (!getProxyConfig()) return null;
  if (isProxyUnavailable()) return null;
  if (!(await domainNeedsProxy(domain))) return null;

  for (let attempt = 0; attempt < MAX_SESSION_ATTEMPTS; attempt++) {
    const generation = await readGeneration(domain);
    const sessionId = buildSessionId(domain, generation);
    const exitIp = await checkSessionAlive(sessionId);

    if (exitIp) {
      proxyUnavailableUntil = 0;
      return { sessionId, exitIp };
    }

    console.warn(`[proxy] Sessão de ${domain} não respondeu (tentativa ${attempt + 1}/${MAX_SESSION_ATTEMPTS}), rotacionando.`);
    await releasePinnedProxy(domain);
  }

  proxyUnavailableUntil = Date.now() + PROXY_DOWN_COOLDOWN_MS;
  console.warn(
    `[proxy] Proxy indisponível (saldo ou credenciais?); seguindo por conexão direta pelos próximos ${PROXY_DOWN_COOLDOWN_MS / 60000} minutos.`
  );

  return null;
};

export const closeProxySessions = async (): Promise<void> => {
  await closeCacheRedisClient();
};
