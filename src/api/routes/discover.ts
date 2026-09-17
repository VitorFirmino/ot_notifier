import type { FastifyInstance } from "fastify";
import { discoverGuildRoute, normalizeBaseUrl } from "@infrastructure/scraping/utils/guildRouteDiscovery";
import { LoginRequiredError } from "@infrastructure/scraping/utils/loginRequiredDetector";
import type { DiscoverGuildsPayload } from "@shared/types/index";
import { assertPublicUrlOrReply, parseOrReply } from "../validation";
import { discoverGuildsBodySchema } from "../schemas";
import { sendSuccess, sendError } from "../responseHelpers";

export const registerDiscoverRoutes = (app: FastifyInstance): void => {
  app.post<{ Body: DiscoverGuildsPayload }>("/api/discover", async (request, reply) => {
    const body = parseOrReply(discoverGuildsBodySchema, request.body, reply);
    if (!body) return;

    const targetUrl = normalizeBaseUrl(body.url);

    if (!(await assertPublicUrlOrReply(targetUrl, reply))) return;

    try {
      const { guilds, html } = await discoverGuildRoute(targetUrl, request.userId);
      return sendSuccess(reply, { guilds, htmlLength: html.length });
    } catch (err: unknown) {
      if (err instanceof LoginRequiredError) {
        return sendError(reply, 401, err.message, {
          code: "LOGIN_REQUIRED",
          domain: err.domain,
          loginUrl: err.loginUrl,
        });
      }
      const message = err instanceof Error ? err.message : "Erro ao efetuar scraping na URL";
      const status =
        message.includes("doesn't exist") ||
        message.includes("não existe") ||
        message.includes("não encontrada")
          ? 404
          : 500;
      return sendError(reply, status, message);
    }
  });
};
