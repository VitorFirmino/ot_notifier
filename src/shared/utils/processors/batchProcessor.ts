import type { ProcessCharacterResult } from "@shared/types/index";
import {
  processCharacterWithRetry,
  type ProcessCharacterWithRetryParams,
} from "./characterFetcher";
import type { QueueItem } from "./queueSeparator";
import pLimit from "p-limit";

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const processBatchSequentially = async (
  batch: QueueItem[],
  params: ProcessCharacterWithRetryParams,
  results: ProcessCharacterResult[],
  stats: {
    cached: number;
    fetched: number;
    errors: number;
    processed: number;
  },
  updateProgress: () => void
): Promise<void> => {
  for (const { name, url } of batch) {
    const { result, fromCache } = await processCharacterWithRetry({
      ...params,
      name,
      url,
    });

    results.push(result);

    if (fromCache) {
      stats.cached++;
    } else {
      stats.fetched++;
    }

    if (result.error) {
      stats.errors++;
    }

    stats.processed++;
    updateProgress();
  }
};

export const processQueueInBatches = async (
  queue: QueueItem[],
  batchSize: number,
  concurrency: number,
  requestDelay: number,
  params: ProcessCharacterWithRetryParams,
  results: ProcessCharacterResult[],
  stats: {
    cached: number;
    fetched: number;
    errors: number;
    processed: number;
  },
  updateProgress: () => void
): Promise<void> => {
  const effectiveConcurrency = Math.max(1, concurrency);
  const limiter = pLimit(effectiveConcurrency);

  for (let i = 0; i < queue.length; i += batchSize) {
    const batch = queue.slice(i, i + batchSize);
    await Promise.all(
      batch.map(({ name, url }) =>
        limiter(async () => {
          const { result, fromCache } = await processCharacterWithRetry({
            ...params,
            name,
            url,
          });

          results.push(result);

          if (fromCache) {
            stats.cached++;
          } else {
            stats.fetched++;
          }

          if (result.error) {
            stats.errors++;
          }

          stats.processed++;
          updateProgress();
        })
      )
    );

    if (i + batchSize < queue.length) {
      await sleep(requestDelay * 2);
    }
  }
};
