import { getProxyConfig } from "./proxyConfig";

const CAPSOLVER_API_BASE = "https://api.capsolver.com";
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

export type CloudflareChallengeSolution = {
  cfClearance: string;
  userAgent: string;
};

const buildProxyString = (): string | null => {
  const proxy = getProxyConfig();
  if (!proxy) return null;

  const parsed = new URL(proxy.server);
  const protocol = parsed.protocol.replace(":", "") || "http";
  const host = parsed.hostname;
  const port = parsed.port || "80";

  return proxy.username && proxy.password
    ? `${protocol}:${host}:${port}:${proxy.username}:${proxy.password}`
    : `${protocol}:${host}:${port}`;
};

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const solveCloudflareChallenge = async (
  targetUrl: string
): Promise<CloudflareChallengeSolution | null> => {
  const clientKey = process.env.CAPSOLVER_API_KEY;
  if (!clientKey) return null;

  const proxy = buildProxyString();
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
        return null;
      }

      if (result.status === "ready" && result.solution?.cookies?.cf_clearance && result.solution.userAgent) {
        return {
          cfClearance: result.solution.cookies.cf_clearance,
          userAgent: result.solution.userAgent,
        };
      }
    }

    console.warn(`[capsolver] Timeout aguardando resolução do desafio para ${targetUrl}`);
    return null;
  } catch (err: unknown) {
    console.warn(`[capsolver] Erro ao resolver desafio Cloudflare para ${targetUrl}:`, err);
    return null;
  }
};
