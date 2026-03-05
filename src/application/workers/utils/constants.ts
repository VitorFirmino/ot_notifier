export const DEFAULT_CONCURRENCY = 5;
export const DEFAULT_CHECK_INTERVAL = 300000;
export const DEFAULT_REQUEST_DELAY = 300;

export const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
