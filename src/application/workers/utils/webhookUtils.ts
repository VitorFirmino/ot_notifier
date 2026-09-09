import type { ServerWebhookConfig } from "@shared/types";

export const getWebhookUrl = (serverConfig: ServerWebhookConfig): string => {
  const { serverId } = serverConfig;
  const normalizedServerId = serverId.toUpperCase();

  const envKey = `WEBHOOK_URL_${normalizedServerId}`;
  const envWebhookUrl = process.env[envKey];

  if (envWebhookUrl) {
    return envWebhookUrl;
  }

  const groupedServerIds = normalizedServerId.split("_");
  for (let prefixLength = groupedServerIds.length - 1; prefixLength > 0; prefixLength -= 1) {
    const groupedEnvKey = `WEBHOOK_URL_${groupedServerIds.slice(0, prefixLength).join("_")}`;
    const groupedEnvWebhookUrl = process.env[groupedEnvKey];

    if (groupedEnvWebhookUrl) {
      return groupedEnvWebhookUrl;
    }
  }

  const { guild } = serverConfig;
  if (guild.webhookUrl) {
    return guild.webhookUrl;
  }

  if (process.env.WEBHOOK_URL) {
    return process.env.WEBHOOK_URL;
  }

  if (process.env.DISCORD_WEBHOOK_URL) {
    return process.env.DISCORD_WEBHOOK_URL;
  }

  return "";
};
