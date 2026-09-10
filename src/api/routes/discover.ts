import type { FastifyInstance } from "fastify";
import { discoverGuildRoute, normalizeBaseUrl } from "../../infrastructure/scraping/utils/guildRouteDiscovery.js";
import { assertPublicHttpUrl, UnsafeUrlError } from "../../shared/utils/urlSafety.js";
import type { DiscoverGuildsPayload } from "../../shared/types/index.js";
import { parseOrReply } from "../validation.js";
import { discoverGuildsBodySchema } from "../schemas.js";

export const registerDiscoverRoutes = (app: FastifyInstance): void => {
  app.post<{ Body: DiscoverGuildsPayload }>("/api/discover", async (request, reply) => {
    const body = parseOrReply(discoverGuildsBodySchema, request.body, reply);
    if (!body) return;

    const targetUrl = normalizeBaseUrl(body.url);

    try {
      await assertPublicHttpUrl(targetUrl);
    } catch (err: unknown) {
      const message = err instanceof UnsafeUrlError ? err.message : "URL inválida.";
      return reply.status(400).send({ error: message });
    }

    try {
      const { guilds, html } = await discoverGuildRoute(targetUrl);
      return reply.status(200).send({ guilds, htmlLength: html.length });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao efetuar scraping na URL";
      const status =
        message.includes("doesn't exist") ||
        message.includes("não existe") ||
        message.includes("não encontrada")
          ? 404
          : 500;
      return reply.status(status).send({ error: message });
    }
  });
};
