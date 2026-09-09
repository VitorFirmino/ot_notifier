import { safe } from "@shared/utils/safe.js";
import { withTimeout } from "@shared/utils/timeout.js";
import { AppError } from "@shared/errors/index.js";

export interface WorkerOptions {
  timeout?: number;
  retries?: number;
  onProgress?: (current: number, total: number) => void;
}

export abstract class WorkerBase {
  protected readonly defaultTimeout: number = 30000;
  protected readonly defaultRetries: number = 3;

  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: WorkerOptions = {}
  ): Promise<T> {
    const timeout = options.timeout || this.defaultTimeout;
    const maxRetries = options.retries || this.defaultRetries;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await safe(() =>
        withTimeout(operation(), timeout, `WorkerBase.executeWithRetry (attempt ${attempt})`)
      );

      if (result.ok) {
        return result.data;
      }

      lastError = result.error;

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new AppError("OPERATION_FAILED", "Operação falhou após todas as tentativas");
  }

  protected async processItem<T, R>(
    item: T,
    processor: (item: T) => Promise<R>,
    _options: WorkerOptions = {}
  ): Promise<{ success: true; result: R } | { success: false; error: string }> {
    const result = await safe(() => processor(item));

    if (result.ok) {
      return { success: true, result: result.data };
    }

    const errorMessage =
      result.error instanceof AppError
        ? result.error.message
        : result.error.message || "Erro desconhecido";

    return { success: false, error: errorMessage };
  }

  protected async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: WorkerOptions = {}
  ): Promise<{
    results: Array<{ success: true; result: R } | { success: false; error: string; item: T }>;
    stats: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    const results: Array<
      { success: true; result: R } | { success: false; error: string; item: T }
    > = [];
    let successful = 0;
    let failed = 0;

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const item = items[itemIndex];
      const result = await this.processItem(item, processor, options);

      if (result.success) {
        results.push(result);
        successful++;
      } else {
        results.push({ ...result, item });
        failed++;
      }

      options.onProgress?.(itemIndex + 1, items.length);
    }

    return {
      results,
      stats: {
        total: items.length,
        successful,
        failed,
      },
    };
  }

  protected log(message: string, type: "info" | "success" | "warn" | "error" = "info"): void {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: "ℹ️",
      success: "✅",
      warn: "⚠️",
      error: "❌",
    }[type];

    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  abstract execute(options?: WorkerOptions): Promise<unknown>;
}
