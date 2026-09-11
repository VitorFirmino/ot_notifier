import { useState } from "react";
import { estimateRemainingMs } from "@lib/eta";

type ProcessingProgress = { processed: number; totalCharacters: number; startTime: number };

const toProgressKey = (progress: ProcessingProgress | undefined): string | undefined =>
  progress ? `${progress.processed}:${progress.totalCharacters}:${progress.startTime}` : undefined;

export const useSmoothedRemainingMs = (progress: ProcessingProgress | undefined): number | null => {
  const [smoothed, setSmoothed] = useState<number | null>(null);
  const [prevKey, setPrevKey] = useState<string | undefined>(() => toProgressKey(progress));

  const key = toProgressKey(progress);
  if (key !== prevKey) {
    setPrevKey(key);

    if (!progress) {
      setSmoothed(null);
    } else {
      const raw = estimateRemainingMs(progress.processed, progress.totalCharacters, progress.startTime);
      setSmoothed((prev) => {
        if (raw === null) return null;
        if (prev === null) return raw;
        return prev * 0.7 + raw * 0.3;
      });
    }
  }

  return smoothed;
};
