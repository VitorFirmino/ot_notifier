import { RateLimiterMemory } from "rate-limiter-flexible";
import { isSensitiveServer } from "../utils/urlUtils";

const createRateLimiter = (serverId?: string) => {
  const sensitive = isSensitiveServer(serverId);

  const points = sensitive ? 2 : 5;
  const duration = 1;

  return new RateLimiterMemory({
    points,
    duration,
    execEvenly: true,
    execEvenlyMinDelayMs: sensitive ? 500 : 200,
  });
};

const rateLimiters = new Map<string, RateLimiterMemory>();

export const getRateLimiter = (serverId?: string): RateLimiterMemory => {
  const key = serverId || "default";

  if (!rateLimiters.has(key)) {
    rateLimiters.set(key, createRateLimiter(serverId));
  }

  const limiter = rateLimiters.get(key);
  if (!limiter) {
    throw new Error(`Rate limiter não disponível para ${key}`);
  }

  return limiter;
};

export const consumeRateLimit = async (serverId?: string, points: number = 1): Promise<void> => {
  const limiter = getRateLimiter(serverId);
  const key = serverId || "default";

  try {
    await limiter.consume(key, points);
  } catch (rejRes: unknown) {
    const retryData = rejRes as { msBeforeNext?: number };
    if (retryData?.msBeforeNext) {
      await new Promise((resolve) => setTimeout(resolve, retryData.msBeforeNext));
      await limiter.consume(key, points);
    } else {
      throw rejRes;
    }
  }
};
