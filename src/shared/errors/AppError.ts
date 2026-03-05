export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack,
    };
  }
}

export class TimeoutError extends AppError {
  constructor(
    public readonly timeoutMs: number,
    operation?: string
  ) {
    super(
      "TIMEOUT",
      operation
        ? `Operação '${operation}' excedeu o timeout de ${timeoutMs}ms`
        : `Timeout de ${timeoutMs}ms excedido`,
      { timeoutMs, operation }
    );
    this.name = "TimeoutError";
  }
}

export class ServerOfflineError extends AppError {
  constructor(
    public readonly server: string,
    public readonly url?: string
  ) {
    super("SERVER_OFFLINE", `Servidor '${server}' está offline ou não respondeu`, { server, url });
    this.name = "ServerOfflineError";
  }
}

export class ScraperError extends AppError {
  constructor(
    message: string,
    public readonly url?: string,
    details?: unknown
  ) {
    super("SCRAPER_ERROR", message, { url, ...(details as Record<string, unknown>) });
    this.name = "ScraperError";
  }
}

export class CloudflareChallengeError extends AppError {
  constructor(
    message: string = "Cloudflare challenge não foi resolvido",
    public readonly url?: string
  ) {
    super("CLOUDFLARE_CHALLENGE", message, { url });
    this.name = "CloudflareChallengeError";
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly field?: string,
    details?: unknown
  ) {
    super("VALIDATION_ERROR", message, { field, ...(details as Record<string, unknown>) });
    this.name = "ValidationError";
  }
}
