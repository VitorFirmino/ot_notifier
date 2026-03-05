import Bottleneck from "bottleneck";

const limiters = new Map<string, Bottleneck>();

const createBottleneckLimiter = (serverId?: string): Bottleneck => {
  const isServer1OrServer2 = serverId === "server1" || serverId === "server2";

  return new Bottleneck({
    maxConcurrent: isServer1OrServer2 ? 1 : 2,
    minTime: isServer1OrServer2 ? 500 : 200,
    reservoir: isServer1OrServer2 ? 100 : 200,
    reservoirRefreshAmount: isServer1OrServer2 ? 100 : 200,
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
