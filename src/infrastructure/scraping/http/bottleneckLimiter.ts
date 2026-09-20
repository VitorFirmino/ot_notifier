import Bottleneck from "bottleneck";

const MAX_CONCURRENT = 2;
const MIN_TIME_MS = 200;
const RESERVOIR_PER_MINUTE = 200;

const limiters = new Map<string, Bottleneck>();

const createBottleneckLimiter = (): Bottleneck =>
  new Bottleneck({
    maxConcurrent: MAX_CONCURRENT,
    minTime: MIN_TIME_MS,
    reservoir: RESERVOIR_PER_MINUTE,
    reservoirRefreshAmount: RESERVOIR_PER_MINUTE,
    reservoirRefreshInterval: 60 * 1000,
  });

export const getBottleneckLimiter = (domain?: string): Bottleneck => {
  const key = domain || "default";

  if (!limiters.has(key)) {
    limiters.set(key, createBottleneckLimiter());
  }

  const limiter = limiters.get(key);
  if (!limiter) {
    throw new Error(`Limiter não disponível para ${key}`);
  }

  return limiter;
};

export const scheduleWithBottleneck = async <T>(
  fn: () => Promise<T>,
  domain?: string
): Promise<T> => {
  const limiter = getBottleneckLimiter(domain);
  return limiter.schedule(fn);
};
