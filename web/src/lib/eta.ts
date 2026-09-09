export const estimateRemainingMs = (
  processed: number,
  total: number,
  startTime: number
): number | null => {
  if (processed <= 0 || total <= 0 || processed >= total) return null;

  const elapsedMs = Date.now() - startTime;
  if (elapsedMs <= 0) return null;

  const msPerItem = elapsedMs / processed;
  return Math.round(msPerItem * (total - processed));
};

export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds > 0 ? `${minutes}min ${seconds}s` : `${minutes}min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
};
