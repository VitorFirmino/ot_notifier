import type { CharacterInfo, ProcessCharacterResult } from "@shared/types/index";
import { characterCache } from "../cache";

export interface QueueItem {
  name: string;
  url: string;
}

export interface SeparatedQueues {
  cachedResults: ProcessCharacterResult[];
  onlineQueue: QueueItem[];
  offlineQueue: QueueItem[];
  charactersWithLevel: QueueItem[];
  charactersWithoutLevel: QueueItem[];
}

export const separateCharactersIntoQueues = (
  characters: Record<string, CharacterInfo>,
  useCache: boolean
): SeparatedQueues => {
  const cachedResults: ProcessCharacterResult[] = [];
  const onlineQueue: QueueItem[] = [];
  const offlineQueue: QueueItem[] = [];
  const charactersWithLevel: QueueItem[] = [];
  const charactersWithoutLevel: QueueItem[] = [];

  Object.entries(characters).forEach(([name, info]) => {
    const cacheKey = `${name}:${info.url}`;
    const hasLastLevel =
      info.last_level !== null && info.last_level !== undefined && info.last_level > 0;

    if (useCache) {
      const cached = characterCache.get(cacheKey);
      if (cached) {
        if (!cached.isOnline) {
          cachedResults.push({
            name: cached.name,
            level: cached.level,
            isOnline: cached.isOnline,
            lastDeath: cached.lastDeath,
          });
          return;
        }
        onlineQueue.push({ name, url: info.url });
        return;
      }
    }

    if (hasLastLevel) {
      charactersWithLevel.push({ name, url: info.url });
    } else {
      charactersWithoutLevel.push({ name, url: info.url });
    }
  });

  return {
    cachedResults,
    onlineQueue,
    offlineQueue,
    charactersWithLevel,
    charactersWithoutLevel,
  };
};
