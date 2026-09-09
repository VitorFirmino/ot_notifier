import { useEffect, useState } from "react";
import { estimateRemainingMs } from "@lib/eta";

type ProcessingProgress = { processed: number; totalCharacters: number; startTime: number };

export const useSmoothedRemainingMs = (progress: ProcessingProgress | undefined): number | null => {
  const [smoothed, setSmoothed] = useState<number | null>(null);

  useEffect(() => {
    if (!progress) {
      setSmoothed(null);
      return;
    }

    const raw = estimateRemainingMs(progress.processed, progress.totalCharacters, progress.startTime);
    setSmoothed((prev) => {
      if (raw === null) return null;
      if (prev === null) return raw;
      return prev * 0.7 + raw * 0.3;
    });
  }, [progress, progress?.processed, progress?.totalCharacters, progress?.startTime]);

  return smoothed;
};
