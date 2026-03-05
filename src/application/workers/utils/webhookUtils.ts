export const getWebhookUrl = (serverConfig: {
  guild: { webhookUrl?: string };
  serverId: string;
}): string => {
  const { serverId } = serverConfig;
  const normalizedServerId = serverId.toUpperCase();

  const envKey = `WEBHOOK_URL_${normalizedServerId}`;
  const envWebhookUrl = process.env[envKey];

  if (envWebhookUrl) {
    return envWebhookUrl;
  }

  const groupedServerIds = normalizedServerId.split("_");
  for (let i = groupedServerIds.length - 1; i > 0; i -= 1) {
    const groupedEnvKey = `WEBHOOK_URL_${groupedServerIds.slice(0, i).join("_")}`;
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

  throw new Error(
    `webhookUrl não configurado para ${serverId}. Configure WEBHOOK_URL_${normalizedServerId}, WEBHOOK_URL_${groupedServerIds[0]}, WEBHOOK_URL (global), DISCORD_WEBHOOK_URL (global) no .env ou guild.webhookUrl em src/infrastructure/storage/data/${serverId}.json`
  );
};
