import Bottleneck from "bottleneck";
import { isSensitiveServer } from "../utils/urlUtils";

const limiters = new Map<string, Bottleneck>();

const createBottleneckLimiter = (serverId?: string): Bottleneck => {
  const sensitive = isSensitiveServer(serverId);

  return new Bottleneck({
    maxConcurrent: sensitive ? 1 : 2,
    minTime: sensitive ? 500 : 200,
    reservoir: sensitive ? 100 : 200,
    reservoirRefreshAmount: sensitive ? 100 : 200,
    reservoirRefreshInterval: 60 * 1000,
  });
};

export const getBottleneckLimiter = (serverId?: string): Bottleneck => {
  const key = serverId || "default";

  if (!limiters.has(key)) {
    limiters.set(key, createBottleneckLimiter(serverId));
  }

  const limiter = limiters.get(key);
  if (!limiter) {
    throw new Error(`Limiter não disponível para ${key}`);
  }

  return limiter;
};

export const scheduleWithBottleneck = async <T>(
  fn: () => Promise<T>,
  serverId?: string
): Promise<T> => {
  const limiter = getBottleneckLimiter(serverId);
  return limiter.schedule(fn);
};
