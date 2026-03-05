import type { CharacterInfo, ProcessCharacterResult } from "@shared/types/index";
import { separateCharactersIntoQueues, type QueueItem } from "./processors/queueSeparator";
import { type ProcessCharacterWithRetryParams } from "./processors/characterFetcher";
import { processQueueInBatches } from "./processors/batchProcessor";

export interface ProcessStats {
  total: number;
  cached: number;
  fetched: number;
  errors: number;
}

interface ProcessOptions {
  concurrency?: number;
  onProgress?: (processed: number, total: number) => void;
  useCache?: boolean;
  cacheTTL?: number;
  silentRetries?: boolean;
  requestDelay?: number;
  customHeaders?: Record<string, string>;
  batchSize?: number;
  serverId?: string;
}

export const processCharacters = async (
  characters: Record<string, CharacterInfo>,
  options: ProcessOptions = {}
): Promise<{ results: ProcessCharacterResult[]; stats: ProcessStats }> => {
  const {
    concurrency = 5,
    onProgress,
    useCache = true,
    cacheTTL = 5 * 60 * 1000,
    silentRetries = true,
    requestDelay = 300,
    customHeaders,
    batchSize = 10,
  } = options;

  const total = Object.keys(characters).length;
  const results: ProcessCharacterResult[] = [];
  const stats = {
    cached: 0,
    fetched: 0,
    errors: 0,
    processed: 0,
  };

  const updateProgress = (): void => {
    if (onProgress) {
      onProgress(stats.processed, total);
    }
  };

  const {
    cachedResults,
    onlineQueue: initialOnlineQueue,
    charactersWithLevel,
    charactersWithoutLevel,
  } = separateCharactersIntoQueues(characters, useCache);

  results.push(...cachedResults);
  stats.cached = cachedResults.length;
  stats.processed = cachedResults.length;
  updateProgress();

  const onlineQueue: QueueItem[] = [...initialOnlineQueue];

  if (charactersWithLevel.length > 0) {
    onlineQueue.push(...charactersWithLevel);
  }

  if (charactersWithoutLevel.length > 0) {
    onlineQueue.push(...charactersWithoutLevel);
  }

  const processParams: ProcessCharacterWithRetryParams = {
    name: "",
    url: "",
    useCache,
    cacheTTL,
    silentRetries,
    requestDelay,
    customHeaders,
    serverId: options.serverId,
  };

  if (onlineQueue.length > 0) {
    await processQueueInBatches(
      onlineQueue,
      batchSize,
      concurrency,
      requestDelay,
      processParams,
      results,
      stats,
      updateProgress
    );
  }

  return {
    results,
    stats: {
      total,
      cached: stats.cached,
      fetched: stats.fetched,
      errors: stats.errors,
    },
  };
};
