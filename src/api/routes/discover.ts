import type { FastifyInstance } from "fastify";
import {
  discoverGuildRoute,
  discoverGuildsForWorld,
  normalizeBaseUrl,
} from "@infrastructure/scraping/utils/guildRouteDiscovery";
import { LoginRequiredError } from "@infrastructure/scraping/utils/loginRequiredDetector";
import { getCacheRedisClient } from "@infrastructure/queue/redisConnection";
import type { DiscoverGuildsPayload } from "@shared/types/index";
import { assertPublicUrlOrReply, parseOrReply } from "../validation";
import { discoverGuildsBodySchema } from "../schemas";
import { sendSuccess, sendError } from "../responseHelpers";

const DISCOVERY_CACHE_TTL_SECONDS = parseInt(process.env.DISCOVERY_CACHE_TTL_SECONDS || "1200", 10);
const DISCOVERY_CACHE_PREFIX = "discover-cache:";

const buildDiscoveryCacheKey = (url: string, world?: string): string =>
  `${DISCOVERY_CACHE_PREFIX}${url}${world ? `:${world}` : ""}`;

export const registerDiscoverRoutes = (app: FastifyInstance): void => {
  app.post<{ Body: DiscoverGuildsPayload }>("/api/discover", async (request, reply) => {
    const body = parseOrReply(discoverGuildsBodySchema, request.body, reply);
    if (!body) return;

    const targetUrl = normalizeBaseUrl(body.url);

    if (!(await assertPublicUrlOrReply(targetUrl, reply))) return;

    const cacheKey = buildDiscoveryCacheKey(targetUrl, body.world);
    const redis = await getCacheRedisClient();

    if (redis) {
      const cached = await redis.get(cacheKey).catch(() => null);
      if (cached) {
        try {
          return sendSuccess(reply, JSON.parse(cached));
        } catch {
          // cache entry corrompida, ignora e busca de novo
        }
      }
    }

    try {
      const { guilds, html, worldOptions, looksLikeServer } = body.world
        ? await discoverGuildsForWorld(targetUrl, body.world)
        : await discoverGuildRoute(targetUrl, request.userId);
      const payload = { guilds, htmlLength: html.length, worldOptions, looksLikeServer };

      const worthCaching = guilds.length > 0 || (worldOptions?.length ?? 0) > 0;
      if (redis && worthCaching) {
        await redis.set(cacheKey, JSON.stringify(payload), "EX", DISCOVERY_CACHE_TTL_SECONDS).catch(() => undefined);
      }

      return sendSuccess(reply, payload);
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
