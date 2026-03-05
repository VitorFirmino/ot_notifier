import type { CharacterStatus, ProcessCharacterResult } from "@shared/types/index";
import { getCharacterStatus } from "@infrastructure/scraping/scraper";
import { characterCache } from "../cache";

export interface ProcessCharacterWithRetryParams {
  name: string;
  url: string;
  useCache: boolean;
  cacheTTL: number;
  silentRetries: boolean;
  requestDelay: number;
  customHeaders?: Record<string, string>;
  serverId?: string;
}

export interface ProcessCharacterWithRetryResult {
  result: ProcessCharacterResult;
  fromCache: boolean;
}

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const processCharacterWithRetry = async ({
  name,
  url,
  useCache,
  cacheTTL,
  silentRetries: _silentRetries,
  requestDelay,
  customHeaders,
  serverId,
}: ProcessCharacterWithRetryParams): Promise<ProcessCharacterWithRetryResult> => {
  const cacheKey = `${name}:${url}`;

  if (useCache) {
    const cached = characterCache.get(cacheKey);
    if (cached && !cached.isOnline) {
      return {
        result: {
          name: cached.name,
          level: cached.level,
          isOnline: cached.isOnline,
          lastDeath: cached.lastDeath,
        },
        fromCache: true,
      };
    }
  }

  try {
    const isServer1OrServer2 = serverId === "server1" || serverId === "server2";
    const baseDelay = isServer1OrServer2
      ? Math.max(requestDelay, 500)
      : requestDelay;

    const randomVariation = 0.8 + Math.random() * 0.4;
    const finalDelay = Math.floor(baseDelay * randomVariation);

    await sleep(finalDelay);

    const result: CharacterStatus = await getCharacterStatus(name, url, customHeaders, serverId);

    if (useCache && !result.isOnline) {
      characterCache.set(cacheKey, result, cacheTTL);
    }

    return {
      result: {
        name: result.name,
        level: result.level,
        isOnline: result.isOnline,
        lastDeath: result.lastDeath,
      },
      fromCache: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";

    return {
      result: {
        name,
        level: null,
        isOnline: false,
        lastDeath: null,
        error: message,
      },
      fromCache: false,
    };
  }
};
