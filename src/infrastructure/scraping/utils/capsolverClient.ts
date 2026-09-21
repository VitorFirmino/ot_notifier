import { getProxyConfig, getProxyConfigForSession } from "./proxyConfig";

const CAPSOLVER_API_BASE = "https://api.capsolver.com";
const BREAKER_FAILURE_THRESHOLD = 3;
const BREAKER_COOLDOWN_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20;

type CreateTaskResponse = {
  errorId: number;
  errorDescription?: string;
  taskId?: string;
};

type TaskResultResponse = {
  errorId: number;
  errorDescription?: string;
  status?: "idle" | "processing" | "ready" | "failed";
  solution?: {
    cookies?: { cf_clearance?: string };
    token?: string;
    userAgent?: string;
  };
};

let consecutiveFailures = 0;
let breakerOpenUntil = 0;

const registerFailure = (): void => {
  consecutiveFailures += 1;
  if (consecutiveFailures < BREAKER_FAILURE_THRESHOLD) return;

  breakerOpenUntil = Date.now() + BREAKER_COOLDOWN_MS;
  consecutiveFailures = 0;
  console.warn(
    `[capsolver] ${BREAKER_FAILURE_THRESHOLD} falhas seguidas (saldo?); pausando chamadas por ${BREAKER_COOLDOWN_MS / 60000} minutos.`
  );
};

export const isCapsolverPaused = (): boolean => Date.now() < breakerOpenUntil;

export type CloudflareChallengeSolution = {
  cfClearance: string;
  userAgent: string;
};

const formatProxy = (server: string, username?: string, password?: string): string => {
  const parsed = new URL(server);
  const protocol = parsed.protocol.replace(":", "") || "http";
  const port = parsed.port || "80";

  return username && password
    ? `${protocol}:${parsed.hostname}:${port}:${username}:${password}`
    : `${protocol}:${parsed.hostname}:${port}`;
};

const buildProxyString = (sessionId?: string | null): string | null => {
  const ownServer = process.env.CAPSOLVER_PROXY_SERVER;
  if (ownServer) {
    return formatProxy(
      ownServer,
      process.env.CAPSOLVER_PROXY_USERNAME,
      process.env.CAPSOLVER_PROXY_PASSWORD
    );
  }

  const proxy = sessionId ? getProxyConfigForSession(sessionId) : getProxyConfig();
  if (!proxy) return null;

  return formatProxy(proxy.server, proxy.username, proxy.password);
};

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const solveCloudflareChallenge = async (
  targetUrl: string,
  proxySessionId?: string | null
): Promise<CloudflareChallengeSolution | null> => {
  const clientKey = process.env.CAPSOLVER_API_KEY;
  if (!clientKey) return null;
  if (Date.now() < breakerOpenUntil) return null;

  const proxy = buildProxyString(proxySessionId);
  if (!proxy) {
    console.warn("[capsolver] CAPSOLVER_API_KEY definido mas SCRAPING_PROXY_SERVER ausente; AntiCloudflareTask exige proxy.");
    return null;
  }

  try {
    const createResponse = await fetch(`${CAPSOLVER_API_BASE}/createTask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientKey,
        task: {
          type: "AntiCloudflareTask",
          websiteURL: targetUrl,
          proxy,
        },
      }),
    });
    const createResult = (await createResponse.json()) as CreateTaskResponse;

    if (createResult.errorId !== 0 || !createResult.taskId) {
      console.warn(`[capsolver] Falha ao criar task: ${createResult.errorDescription || "erro desconhecido"}`);
      registerFailure();
      return null;
    }

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await wait(POLL_INTERVAL_MS);

      const resultResponse = await fetch(`${CAPSOLVER_API_BASE}/getTaskResult`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientKey, taskId: createResult.taskId }),
      });
      const result = (await resultResponse.json()) as TaskResultResponse;

      if (result.errorId !== 0) {
        console.warn(`[capsolver] Task falhou: ${result.errorDescription || "erro desconhecido"}`);
        registerFailure();
        return null;
      }

      if (result.status === "ready" && result.solution?.cookies?.cf_clearance && result.solution.userAgent) {
        consecutiveFailures = 0;
        return {
          cfClearance: result.solution.cookies.cf_clearance,
          userAgent: result.solution.userAgent,
        };
      }
    }

    console.warn(`[capsolver] Timeout aguardando resolução do desafio para ${targetUrl}`);
    registerFailure();
    return null;
  } catch (err: unknown) {
    console.warn(`[capsolver] Erro ao resolver desafio Cloudflare para ${targetUrl}:`, err);
    registerFailure();
    return null;
  }
};
