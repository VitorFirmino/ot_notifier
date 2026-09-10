import type { FastifyInstance } from "fastify";
import { getAllServerConfigs } from "@infrastructure/storage/serverConfigManager";

export const registerStatsRoutes = (app: FastifyInstance): void => {
  app.get("/api/stats", async (_request, reply) => {
    const configs = await getAllServerConfigs();
    const activeCount = configs.filter(
      (config) => config.guild.enabled !== false && config.isWorking !== false
    ).length;
    let totalChars = 0;
    let onlineChars = 0;
    configs.forEach((config) => {
      if (config.guild.enabled !== false && config.isWorking !== false) {
        const chars = Object.values(config.characters || {});
        totalChars += chars.length;
        onlineChars += chars.filter((char) => char.isOnline === true).length;
      }
    });

    return reply.status(200).send({
      activeServers: activeCount,
      totalServers: configs.length,
      monitoredCharacters: totalChars,
      onlineCharacters: onlineChars,
      antiBotStatus: "Conexão Segura",
      antiBotChecks: 98,
    });
  });
};
