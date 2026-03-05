import axios, { AxiosError } from "axios";
import { UP_MESSAGES } from "@infrastructure/storage/messageRules";
import { webhookRateLimiter } from "@shared/utils/webhookRateLimiter";
import { retryWithBackoff } from "@shared/utils/retry";
import type {
  SendWebhookParams,
  SendGuildWebhookParams,
  SendDeathWebhookParams,
} from "@shared/types/index";

const isRateLimitError = (error: unknown): boolean => {
  if (!(error instanceof AxiosError)) {
    return false;
  }

  return error.response?.status === 429;
};

const getRetryAfter = (error: AxiosError): number => {
  const headers = error.response?.headers;
  if (!headers) {
    return 5000;
  }

  const RETRY_AFTER_HEADERS = ["retry-after", "Retry-After"];
  const RATE_LIMIT_HEADERS = ["x-ratelimit-reset-after", "X-RateLimit-Reset-After"];

  const getHeaderValue = (headerNames: string[]): string | number | undefined => {
    return headerNames.map((name) => headers[name]).find(Boolean);
  };

  const parseSeconds = (value: string | number | undefined): number | null => {
    if (!value) return null;

    const seconds = typeof value === "string" ? parseFloat(value) : value;

    if (isNaN(seconds) || seconds <= 0) return null;

    return Math.ceil(seconds * 1000);
  };

  const retryAfter = parseSeconds(getHeaderValue(RETRY_AFTER_HEADERS));
  if (retryAfter) return retryAfter;

  const rateLimitReset = parseSeconds(getHeaderValue(RATE_LIMIT_HEADERS));
  if (rateLimitReset) return rateLimitReset;

  return 5000;
};

const sendWebhookRequest = async (webhookUrl: string, content: string): Promise<void> => {
  await webhookRateLimiter.execute(async () => {
    return axios.post(webhookUrl, { content }, { timeout: 10000 });
  });
};

const handleLevelWebhookRetry =
  (name: string) =>
  (attempt: number, error: Error): void => {
    if (isRateLimitError(error)) {
      const retryAfter = getRetryAfter(error as AxiosError);
      console.warn(
        `⏳ Rate limit atingido para ${name}. Tentando novamente em ${
          retryAfter / 1000
        }s (tentativa ${attempt}/5)`
      );
    } else {
      console.warn(
        `⚠️ Erro ao enviar webhook para ${name}. Tentativa ${attempt}/5: ${error.message}`
      );
    }
  };

const handleGuildWebhookRetry = (attempt: number, error: Error): void => {
  if (isRateLimitError(error)) {
    const retryAfter = getRetryAfter(error as AxiosError);
    console.warn(
      `⏳ Rate limit atingido para webhook de guild. Tentando novamente em ${
        retryAfter / 1000
      }s (tentativa ${attempt}/5)`
    );
  } else {
    console.warn(`⚠️ Erro ao enviar webhook de guild. Tentativa ${attempt}/5: ${error.message}`);
  }
};

const handleDeathWebhookRetry =
  (name: string) =>
  (attempt: number, error: Error): void => {
    if (isRateLimitError(error)) {
      const retryAfter = getRetryAfter(error as AxiosError);
      console.warn(
        `⏳ Rate limit atingido para webhook de morte de ${name}. Tentando novamente em ${
          retryAfter / 1000
        }s (tentativa ${attempt}/5)`
      );
    } else {
      console.warn(
        `⚠️ Erro ao enviar webhook de morte para ${name}. Tentativa ${attempt}/5: ${error.message}`
      );
    }
  };

const getCustomRetryDelay = (error: Error): number | null => {
  if (isRateLimitError(error)) {
    return getRetryAfter(error as AxiosError);
  }
  return null;
};

export const sendWebhook = async ({
  webhookUrl,
  name,
  currentLevel,
  status,
  upStreak,
  milestoneReached,
}: SendWebhookParams): Promise<void> => {
  const messageMap: Record<number, string> = Object.fromEntries(
    UP_MESSAGES.map((rule) => [rule.minStreak, rule.message])
  );

  const extraMessage =
    status === "up" && milestoneReached ? (messageMap[milestoneReached] ?? "") : "";

  const content =
    status === "up"
      ? `📈 **${name}** subiu para o nível **${currentLevel}**! 🚀\n${extraMessage}`
      : `📉 **${name}** perdeu um nível e agora está no **${currentLevel}**!`;

  try {
    await retryWithBackoff(() => sendWebhookRequest(webhookUrl, content), {
      maxRetries: 5,
      initialDelay: 1000,
      maxDelay: 60000,
      backoffMultiplier: 2,
      getRetryDelay: getCustomRetryDelay,
      onRetry: handleLevelWebhookRetry(name),
    });

    console.log(
      `[Webhook enviado] ${name} (${status}, streak: ${upStreak}, milestone: ${
        milestoneReached ?? "-"
      })`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error(`❌ Erro ao enviar webhook para ${name}: ${message}`);
  }
};

export const sendGuildSyncWebhook = async ({
  webhookUrl,
  newMembers,
  totalMembers,
}: SendGuildWebhookParams): Promise<void> => {
  if (newMembers.length === 0) {
    return;
  }

  const membersList = newMembers.slice(0, 10).join(", ");
  const remainingCount = newMembers.length > 10 ? newMembers.length - 10 : 0;
  const remainingText = remainingCount > 0 ? `\n... e mais ${remainingCount} membro(s)` : "";

  const content = `🎉 **Nova sincronização de guild!**\n\n📊 Total de membros: **${totalMembers}**\n\n🆕 Novos membros adicionados (${newMembers.length}):\n${membersList}${remainingText}`;

  try {
    await retryWithBackoff(() => sendWebhookRequest(webhookUrl, content), {
      maxRetries: 5,
      initialDelay: 1000,
      maxDelay: 60000,
      backoffMultiplier: 2,
      getRetryDelay: getCustomRetryDelay,
      onRetry: handleGuildWebhookRetry,
    });

    console.log(`[Webhook de guild enviado] ${newMembers.length} novos membros adicionados`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error(`❌ Erro ao enviar webhook de guild: ${message}`);
  }
};

export const sendDeathWebhook = async ({
  webhookUrl,
  name,
  deathLevel,
  killers,
  deathText,
  time,
}: SendDeathWebhookParams): Promise<void> => {
  const killersList = killers.length > 0 ? killers.join(", ") : "Desconhecido";

  const timeText = time ? `🕐 **${time}**\n\n` : "";
  const content = `💀 **${name}** morreu no nível **${deathLevel}** por **${killersList}**!\n\n${timeText}📝 ${deathText}`;

  try {
    await retryWithBackoff(() => sendWebhookRequest(webhookUrl, content), {
      maxRetries: 5,
      initialDelay: 1000,
      maxDelay: 60000,
      backoffMultiplier: 2,
      getRetryDelay: getCustomRetryDelay,
      onRetry: handleDeathWebhookRetry(name),
    });

    console.log(`[Webhook de morte enviado] ${name} (nível ${deathLevel})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error(`❌ Erro ao enviar webhook de morte para ${name}: ${message}`);
  }
};
