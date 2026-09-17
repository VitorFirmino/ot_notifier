import type { FastifyInstance } from "fastify";
import { loadServerConfig } from "@infrastructure/storage/serverConfigManager";
import { fetchGuildPage } from "@infrastructure/scraping/http/guildFetcher";
import { parseCharacterDetailsFromHtml } from "@infrastructure/scraping/parsers/characterParser";
import type { InspectCharacterParams } from "@shared/types/index";
import { assertPublicUrlOrReply, parseOrReply } from "../validation";
import { inspectCharacterBodySchema } from "../schemas";
import { sendSuccess, sendError } from "../responseHelpers";

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
      return sendError(reply, 400, "URL do personagem não pôde ser determinada");
    }

    if (!(await assertPublicUrlOrReply(targetUrl, reply))) return;

    try {
      const html = await fetchGuildPage(targetUrl);
      const details = parseCharacterDetailsFromHtml(html, name, targetUrl);
      return sendSuccess(reply, details);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro de conexão com o servidor";
      return sendError(reply, 500, `Erro ao inspecionar personagem: ${message}`);
    }
  });
};
