import { createRedisConnection } from "@infrastructure/queue/redisConnection";
import type { ActivityEvent } from "@shared/types/index";

export const EVENTS_KEY = "ot_notifier:events";
export const MAX_EVENTS = 200;

let redisInstance: ReturnType<typeof createRedisConnection> | null = null;

const getRedis = () => {
  if (!redisInstance) {
    redisInstance = createRedisConnection();
  }
  return redisInstance;
};

export const recordEvent = async (event: ActivityEvent): Promise<void> => {
  try {
    const redis = getRedis();
    await redis.lpush(EVENTS_KEY, JSON.stringify(event));
    await redis.ltrim(EVENTS_KEY, 0, MAX_EVENTS - 1);
  } catch (err: unknown) {
    console.warn("⚠️ [eventLog] Falha ao registrar evento:", err);
  }
};

export const recordCharacterEvent = async (
  params: Omit<ActivityEvent, "id" | "timestamp">
): Promise<void> => {
  await recordEvent({
    id: `evt-${Date.now()}-${params.characterName}`,
    timestamp: new Date().toISOString(),
    ...params,
  });
};

export const getRecentEvents = async (limit = 50): Promise<ActivityEvent[]> => {
  try {
    const redis = getRedis();
    const raw = await redis.lrange(EVENTS_KEY, 0, limit - 1);
    return raw.reduce<ActivityEvent[]>((events, entry) => {
      try {
        events.push(JSON.parse(entry) as ActivityEvent);
      } catch (err: unknown) {
        console.warn("⚠️ [eventLog] Ignorando entrada corrompida no log de eventos:", err);
      }
      return events;
    }, []);
  } catch (err: unknown) {
    console.warn("⚠️ [eventLog] Falha ao ler eventos:", err);
    return [];
  }
};
