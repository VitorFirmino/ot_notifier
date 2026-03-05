interface QueueTask<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

interface RateLimiterState {
  queue: QueueTask<unknown>[];
  processing: boolean;
  lastRequestTime: number;
}

const MAX_REQUESTS_PER_SECOND = 5;
const MIN_INTERVAL = 1000 / MAX_REQUESTS_PER_SECOND;

let rateLimiterState: RateLimiterState = {
  queue: [],
  processing: false,
  lastRequestTime: 0,
};

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const processQueue = async (): Promise<void> => {
  if (rateLimiterState.processing) {
    return;
  }

  if (rateLimiterState.queue.length === 0) {
    return;
  }

  rateLimiterState = {
    ...rateLimiterState,
    processing: true,
  };

  while (rateLimiterState.queue.length > 0) {
    const task = rateLimiterState.queue.shift();

    if (!task) {
      continue;
    }

    try {
      const now = Date.now();
      const timeSinceLastRequest = now - rateLimiterState.lastRequestTime;

      if (timeSinceLastRequest < MIN_INTERVAL) {
        const waitTime = MIN_INTERVAL - timeSinceLastRequest;
        await sleep(waitTime);
      }

      rateLimiterState = {
        ...rateLimiterState,
        lastRequestTime: Date.now(),
      };

      await task.fn();
    } catch (error) {
      task.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  rateLimiterState = {
    ...rateLimiterState,
    processing: false,
  };
};

export const execute = async <T>(fn: () => Promise<T>): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const task: QueueTask<T> = {
      fn: async () => {
        const result = await fn();
        resolve(result);
        return result;
      },
      resolve,
      reject: (error: Error) => {
        reject(error);
      },
    };

    rateLimiterState = {
      ...rateLimiterState,
      queue: [...rateLimiterState.queue, task as QueueTask<unknown>],
    };

    processQueue();
  });
};

export const getQueueLength = (): number => {
  return rateLimiterState.queue.length;
};

export const webhookRateLimiter = {
  execute,
  get queueLength(): number {
    return getQueueLength();
  },
};
