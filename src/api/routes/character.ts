import type { FastifyInstance } from "fastify";
import { loadServerConfig } from "../../infrastructure/storage/serverConfigManager.js";
import { fetchGuildPage } from "../../infrastructure/scraping/http/guildFetcher.js";
import { parseCharacterDetailsFromHtml } from "../../infrastructure/scraping/parsers/characterParser.js";
import { assertPublicHttpUrl, UnsafeUrlError } from "../../shared/utils/urlSafety.js";
import type { InspectCharacterParams } from "../../shared/types/index.js";
import { parseOrReply } from "../validation.js";
import { inspectCharacterBodySchema } from "../schemas.js";

export const registerCharacterRoutes = (app: FastifyInstance): void => {
  app.post<{ Body: InspectCharacterParams }>("/api/character/inspect", async (request, reply) => {
    const body = parseOrReply(inspectCharacterBodySchema, request.body, reply);
    if (!body) return;
    const { name, url: providedUrl, serverId } = body;

    let targetUrl = providedUrl;
    if (!targetUrl && serverId) {
      const config = loadServerConfig(serverId);
      if (config?.characters?.[name]?.url) {
        targetUrl = config.characters[name].url;
      } else if (config?.guild.url) {
        try {
          const baseObj = new URL(config.guild.url);
          targetUrl = `${baseObj.origin}/?subtopic=characters&name=${encodeURIComponent(name)}`;
        } catch (err: unknown) {
          console.warn(`⚠️ Falha ao construir URL para personagem ${name}:`, err);
        }
      }
    }

    if (!targetUrl) {
      return reply.status(400).send({ error: "URL do personagem não pôde ser determinada" });
    }

    try {
      await assertPublicHttpUrl(targetUrl);
    } catch (err: unknown) {
      const message = err instanceof UnsafeUrlError ? err.message : "URL inválida.";
      return reply.status(400).send({ error: message });
    }

    try {
      const html = await fetchGuildPage(targetUrl);
      const details = parseCharacterDetailsFromHtml(html, name, targetUrl);
      return reply.status(200).send(details);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro de conexão com o servidor";
      return reply.status(500).send({ error: `Erro ao inspecionar personagem: ${message}` });
    }
  });
};
