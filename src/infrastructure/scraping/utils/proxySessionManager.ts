import axios from "axios";
import { createHash } from "crypto";
import type { Redis } from "ioredis";
import { createRedisConnection } from "@infrastructure/queue/redisConnection";
import { getAxiosProxyConfig, getProxyConfig } from "./proxyConfig";

const GENERATION_KEY_PREFIX = "proxy_session_gen:";
const HEALTH_CHECK_URL = "https://api.ipify.org?format=json";
const HEALTH_CHECK_TIMEOUT_MS = 12000;
const MAX_SESSION_ATTEMPTS = 3;

export type ProxySession = {
  sessionId: string;
  exitIp: string;
};

let client: Redis | null = null;
let clientUnavailable = false;
const localGenerations = new Map<string, number>();

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

const readGeneration = async (domain: string): Promise<number> => {
  const redis = getClient();
  if (!redis) return localGenerations.get(domain) ?? 0;

  const raw = await redis.get(`${GENERATION_KEY_PREFIX}${domain}`).catch(() => null);
  return raw ? parseInt(raw, 10) || 0 : 0;
};

export const buildSessionId = (domain: string, generation: number): string =>
  createHash("sha1").update(`${domain}:${generation}`).digest("hex").slice(0, 10);

export const releasePinnedProxy = async (domain: string): Promise<void> => {
  const redis = getClient();

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

export const acquireProxyForDomain = async (domain: string): Promise<ProxySession | null> => {
  if (!getProxyConfig()) return null;

  for (let attempt = 0; attempt < MAX_SESSION_ATTEMPTS; attempt++) {
    const generation = await readGeneration(domain);
    const sessionId = buildSessionId(domain, generation);
    const exitIp = await checkSessionAlive(sessionId);

    if (exitIp) return { sessionId, exitIp };

    console.warn(`[proxy] Sessão de ${domain} não respondeu (tentativa ${attempt + 1}/${MAX_SESSION_ATTEMPTS}), rotacionando.`);
    await releasePinnedProxy(domain);
  }

  return null;
};

export const closeProxySessions = async (): Promise<void> => {
  if (!client) return;
  await client.quit().catch(() => undefined);
  client = null;
};
