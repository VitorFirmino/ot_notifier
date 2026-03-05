const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_INITIAL_DELAY = 1000;
const DEFAULT_MAX_DELAY = 10000;
const DEFAULT_BACKOFF_MULTIPLIER = 2;

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
  getRetryDelay?: (error: Error, attempt: number) => number | null;
}

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const calculateDelay = (
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number => {
  const delay = initialDelay * Math.pow(backoffMultiplier, attempt);
  return Math.min(delay, maxDelay);
};

const attemptRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  attempt: number
): Promise<T> => {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    initialDelay = DEFAULT_INITIAL_DELAY,
    maxDelay = DEFAULT_MAX_DELAY,
    backoffMultiplier = DEFAULT_BACKOFF_MULTIPLIER,
    onRetry,
    getRetryDelay,
  } = options;

  try {
    return await fn();
  } catch (error) {
    const lastError = error instanceof Error ? error : new Error(String(error));

    if (attempt >= maxRetries) {
      throw lastError;
    }

    const customDelay = getRetryDelay?.(lastError, attempt);
    const delay = customDelay ?? calculateDelay(attempt, initialDelay, maxDelay, backoffMultiplier);

    onRetry?.(attempt + 1, lastError);

    await sleep(delay);

    return attemptRetry(fn, options, attempt + 1);
  }
};

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  return attemptRetry(fn, options, 0);
};
