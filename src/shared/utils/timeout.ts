import { TimeoutError } from "../errors/AppError";

export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation?: string
): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new TimeoutError(timeoutMs, operation));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
};

export const withTimeoutAndRetry = async <T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  maxRetries: number = 3,
  operation?: string
): Promise<T> => {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs, operation);
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new TimeoutError(timeoutMs, operation);
};
