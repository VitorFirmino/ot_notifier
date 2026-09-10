import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import dotenv from "dotenv";
import { fromNodeHeaders } from "better-auth/node";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";
import {
  getAllServerConfigs,
  saveServerConfig,
  loadServerConfig,
  extractServerIdFromUrl,
  updateServerCharacters,
  deleteServerConfig,
  updateServerWorkingStatus,
} from "../infrastructure/storage/serverConfigManager.js";
import { fetchGuildPage } from "../infrastructure/scraping/http/guildFetcher.js";
import { getGuildMembers } from "../infrastructure/scraping/parsers/guildParser.js";
import { discoverGuildRoute, normalizeBaseUrl } from "../infrastructure/scraping/utils/guildRouteDiscovery.js";
import { fetchImageProxied } from "../infrastructure/scraping/utils/imageProxy.js";
import { parseCharacterDetailsFromHtml } from "../infrastructure/scraping/parsers/characterParser.js";
import { assertPublicHttpUrl, UnsafeUrlError } from "../shared/utils/urlSafety.js";
import { getRecentEvents } from "../infrastructure/events/eventLog.js";
import { sendTestWebhook } from "../infrastructure/webhooks/webhook.js";
import { getWebhookUrl } from "../application/workers/utils/webhookUtils.js";
import {
  getAllServerStates,
  clearProcessingState,
  clearVerifyingState,
} from "../shared/utils/serverStateManager.js";
import {
  getServerCheckQueue,
  addOrUpdateServerSchedule,
  removeServerSchedule,
  scheduleServerRetry,
  triggerServerCheckNow,
} from "../infrastructure/queue/serverQueueManager.js";
import type {
  ServerConfig,
  AddServerPayload,
  UpdateServerPayload,
  InspectCharacterParams,
  DiscoverGuildsPayload,
  CharacterInfo,
} from "../shared/types/index.js";
import { parseOrReply } from "./validation.js";
import {
  testWebhookBodySchema,
  discoverGuildsBodySchema,
  proxyImageQuerySchema,
  addServerBodySchema,
  updateServerBodySchema,
  inspectCharacterBodySchema,
} from "./schemas.js";

dotenv.config({ quiet: true });

const PORT = process.env.API_PORT ? parseInt(process.env.API_PORT, 10) : 3001;

const ALLOWED_PROXIED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"];

interface ServerParams {
  id: string;
}

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

export const buildFastifyServer = async () => {
  const { auth } = await import("../infrastructure/auth/auth.js");

  const app = Fastify({
    logger: false,
  });

  app.register(cors, {
    origin: process.env.DASHBOARD_URL ?? "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  });

  app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
  });

  app.addHook("onRequest", async (request, reply) => {
    if (request.method === "OPTIONS" || request.url.startsWith("/api/auth/")) {
      return;
    }

    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) {
      return reply.status(401).send({ error: "Não autenticado." });
    }
    request.userId = session.user.id;
  });

  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    handler: async (request, reply) => {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const headers = fromNodeHeaders(request.headers);

      const authRequest = new Request(url.toString(), {
        method: request.method,
        headers,
        body:
          request.method === "GET" || request.method === "HEAD"
            ? undefined
            : JSON.stringify(request.body),
      });

      const response = await auth.handler(authRequest);

      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      return reply.send(response.body ? await response.text() : null);
    },
  });

  try {
    const serverAdapter = new FastifyAdapter();
    createBullBoard({
      queues: [new BullMQAdapter(getServerCheckQueue())],
      serverAdapter: serverAdapter as any,
    });
    serverAdapter.setBasePath("/admin/queues");
    app.register(serverAdapter.registerPlugin(), {
      prefix: "/admin/queues",
    });
    console.log("📊 [Bull-Board] Painel de Filas ativado na rota /admin/queues");
  } catch (err: unknown) {
    console.warn("⚠️ Não foi possível inicializar o painel Bull-Board:", err);
  }

  app.get("/api/servers", async (_request, reply) => {
    const configs = await getAllServerConfigs();
    const states = getAllServerStates();

    const configsWithLiveState = configs.map((config) => {
      const state = states[config.serverId];
      if (!state?.processing && !state?.verifying) return config;

      return {
        ...config,
        liveState: {
          ...(state.processing ? { processing: state.processing } : {}),
          ...(state.verifying ? { verifying: state.verifying } : {}),
        },
      };
    });

    return reply.status(200).send(configsWithLiveState);
  });

  app.post<{ Body: { webhookUrl?: string } }>("/api/test-webhook", async (request, reply) => {
    const body = parseOrReply(testWebhookBodySchema, request.body, reply);
    if (!body) return;
    const webhookUrl = body.webhookUrl;

    try {
      await assertPublicHttpUrl(webhookUrl);
    } catch (err: unknown) {
      const message = err instanceof UnsafeUrlError ? err.message : "URL de webhook inválida.";
      return reply.status(400).send({ error: message });
    }

    try {
      await sendTestWebhook(webhookUrl);
      return reply.status(200).send({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido ao enviar webhook";
      return reply.status(502).send({ error: `Falha ao enviar mensagem de teste: ${message}` });
    }
  });

  app.get<{ Querystring: { limit?: string } }>("/api/events", async (request, reply) => {
    const limit = Number.parseInt(request.query.limit ?? "50", 10);
    const events = await getRecentEvents(Number.isFinite(limit) && limit > 0 ? limit : 50);
    return reply.status(200).send(events);
  });

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

  app.get<{ Querystring: { url?: string } }>("/api/proxy-image", async (request, reply) => {
    const query = parseOrReply(proxyImageQuerySchema, request.query, reply);
    if (!query) return;
    const rawUrl = query.url;

    try {
      await assertPublicHttpUrl(rawUrl);
    } catch (err: unknown) {
      const message = err instanceof UnsafeUrlError ? err.message : "URL inválida.";
      return reply.status(400).send({ error: message });
    }

    try {
      const image = await fetchImageProxied(rawUrl);
      if (!image) {
        return reply.status(502).send({ error: "Não foi possível obter a imagem da URL informada." });
      }
      const contentType = image.contentType.split(";")[0].trim().toLowerCase();
      if (!ALLOWED_PROXIED_IMAGE_TYPES.includes(contentType)) {
        return reply.status(415).send({ error: "Tipo de imagem não suportado." });
      }
      return reply
        .status(200)
        .header("Content-Type", contentType)
        .header("Cache-Control", "public, max-age=86400")
        .header("Content-Disposition", 'inline; filename="image"')
        .header("X-Content-Type-Options", "nosniff")
        .header("Content-Security-Policy", "default-src 'none'; sandbox")
        .send(image.buffer);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao buscar a imagem";
      return reply.status(500).send({ error: message });
    }
  });

  app.post<{ Body: AddServerPayload }>("/api/servers", async (request, reply) => {
    const body = parseOrReply(addServerBodySchema, request.body, reply);
    if (!body) return;
    const { url, name, webhookUrl, logoUrl, kills, world } = body;

    try {
      await assertPublicHttpUrl(url);
    } catch (err: unknown) {
      const message = err instanceof UnsafeUrlError ? err.message : "URL inválida.";
      return reply.status(400).send({ error: message });
    }

    const serverId = extractServerIdFromUrl(url);
    const existingConfig = loadServerConfig(serverId);

    if (existingConfig?.guild.url) {
      try {
        if (new URL(existingConfig.guild.url).origin !== new URL(url).origin) {
          return reply.status(409).send({
            error: `O identificador "${serverId}" já está em uso por outro servidor (${existingConfig.serverName}). Use uma URL com um domínio diferente ou remova o servidor existente primeiro.`,
          });
        }
      } catch (err: unknown) {
        console.warn(`⚠️ [${serverId}] Falha ao comparar URLs de servidor existente:`, err);
      }
    }

    const newConfig: ServerConfig = {
      serverId,
      serverName: name || existingConfig?.serverName || `Server ${serverId}`,
      guild: {
        url,
        enabled: true,
        webhookUrl: webhookUrl || existingConfig?.guild.webhookUrl,
        logoUrl: logoUrl || existingConfig?.guild.logoUrl,
        kills: kills || existingConfig?.guild.kills,
        world: world || existingConfig?.guild.world,
      },
      characters: existingConfig?.characters || {},
      createdByUserId: existingConfig?.createdByUserId ?? request.userId,
      isWorking: true,
      lastUpdate: new Date().toISOString(),
    };

    await saveServerConfig(newConfig);

    if (Object.keys(newConfig.characters).length === 0) {
      try {
        const members = await getGuildMembers(url);
        const charsObj: Record<string, CharacterInfo> = {};
        members.forEach((member) => {
          charsObj[member.name] = {
            url: member.url,
            last_level: null,
            up_streak: 0,
            last_milestone: 0,
            last_death: null,
          };
        });
        newConfig.characters = charsObj;
        await saveServerConfig(newConfig);
      } catch (err: unknown) {
        console.warn(`⚠️ Não foi possível obter lista inicial de membros para ${serverId}:`, err);
        newConfig.isWorking = false;
        await saveServerConfig(newConfig);
      }
    }

    if (newConfig.guild.enabled !== false && newConfig.isWorking !== false) {
      await addOrUpdateServerSchedule(serverId, newConfig.settings?.checkInterval || 120000);
    }

    return reply.status(201).send(newConfig);
  });

  app.post<{ Params: ServerParams }>("/api/servers/:id/sync", async (request, reply) => {
    const { id: serverId } = request.params;
    const config = loadServerConfig(serverId);

    if (!config) {
      return reply.status(404).send({ error: "Servidor não encontrado" });
    }

    try {
      await assertPublicHttpUrl(config.guild.url);
    } catch (err: unknown) {
      const message = err instanceof UnsafeUrlError ? err.message : "URL inválida.";
      return reply.status(400).send({ error: message });
    }

    try {
      const members = await getGuildMembers(config.guild.url);
      const updatedChars = { ...config.characters };

      members.forEach((member) => {
        if (!updatedChars[member.name]) {
          updatedChars[member.name] = {
            url: member.url,
            last_level: null,
            up_streak: 0,
            last_milestone: 0,
            last_death: null,
          };
        }
      });

      await updateServerCharacters(serverId, updatedChars);
      await triggerServerCheckNow(serverId);
      const updatedConfig = loadServerConfig(serverId);
      return reply.status(200).send(updatedConfig);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro interno ao sincronizar";
      const isNotFound =
        message.includes("doesn't exist") ||
        message.includes("não existe") ||
        message.includes("não encontrada");
      if (isNotFound) {
        await updateServerWorkingStatus(serverId, false);
        await scheduleServerRetry(serverId);
      }
      const status = isNotFound ? 404 : 500;
      return reply.status(status).send({ error: `Erro ao sincronizar: ${message}` });
    }
  });

  app.post<{ Params: ServerParams }>("/api/servers/:id/test-webhook", async (request, reply) => {
    const { id: serverId } = request.params;
    const config = loadServerConfig(serverId);

    if (!config) {
      return reply.status(404).send({ error: "Servidor não encontrado" });
    }

    const webhookUrl = getWebhookUrl(config);
    if (!webhookUrl) {
      return reply.status(400).send({ error: "Nenhum webhook Discord configurado para este servidor." });
    }

    try {
      await assertPublicHttpUrl(webhookUrl);
    } catch (err: unknown) {
      const message = err instanceof UnsafeUrlError ? err.message : "URL de webhook inválida.";
      return reply.status(400).send({ error: message });
    }

    try {
      await sendTestWebhook(webhookUrl);
      return reply.status(200).send({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido ao enviar webhook";
      return reply.status(502).send({ error: `Falha ao enviar mensagem de teste: ${message}` });
    }
  });

  app.put<{ Params: ServerParams; Body: UpdateServerPayload }>(
    "/api/servers/:id",
    async (request, reply) => {
      const { id: serverId } = request.params;
      const existing = loadServerConfig(serverId);
      if (!existing) {
        return reply.status(404).send({ error: "Servidor não encontrado" });
      }
      if (existing.createdByUserId && existing.createdByUserId !== request.userId) {
        return reply.status(403).send({ error: "Você não tem permissão para editar este servidor." });
      }

      const body = parseOrReply(updateServerBodySchema, request.body ?? {}, reply);
      if (!body) return;

      if (body.guild?.url) {
        try {
          await assertPublicHttpUrl(body.guild.url);
        } catch (err: unknown) {
          const message = err instanceof UnsafeUrlError ? err.message : "URL inválida.";
          return reply.status(400).send({ error: message });
        }
      }

      const updated: ServerConfig = {
        ...existing,
        createdByUserId: existing.createdByUserId ?? request.userId,
        serverName: body.serverName ?? existing.serverName,
        guild: {
          ...existing.guild,
          ...body.guild,
          enabled: body.guild?.enabled ?? body.enabled ?? existing.guild.enabled,
          webhookUrl: body.guild?.webhookUrl ?? body.webhookUrl ?? existing.guild.webhookUrl,
          logoUrl: body.guild?.logoUrl ?? body.logoUrl ?? existing.guild.logoUrl,
        },
      };

      await saveServerConfig(updated);

      if (updated.guild.enabled === false) {
        await removeServerSchedule(serverId);
        await clearProcessingState(serverId);
        await clearVerifyingState(serverId);
      } else if (updated.isWorking === false) {
        await scheduleServerRetry(serverId);
      } else {
        await addOrUpdateServerSchedule(serverId, updated.settings?.checkInterval || 120000);
      }

      return reply.status(200).send(updated);
    }
  );

  app.delete<{ Params: ServerParams }>("/api/servers/:id", async (request, reply) => {
    const { id: serverId } = request.params;
    const existing = loadServerConfig(serverId);
    if (!existing) {
      return reply.status(404).send({ error: "Servidor não encontrado" });
    }
    if (existing.createdByUserId !== request.userId) {
      return reply.status(403).send({ error: "Você não tem permissão para remover este servidor." });
    }

    await deleteServerConfig(serverId);
    await removeServerSchedule(serverId);
    return reply.status(200).send({ success: true, message: `Servidor ${serverId} removido` });
  });

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

  return app;
};

export const startApiServer = async () => {
  try {
    const { AppDataSource } = await import("../infrastructure/database/dataSource.js");
    await AppDataSource.initialize();
    console.log("🐘 [TypeORM] Conectado ao PostgreSQL.");

    const app = await buildFastifyServer();
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 Fastify REST API ativa em http://localhost:${PORT}`);
    console.log(`📊 Painel Bull-Board ativo em http://localhost:${PORT}/admin/queues`);
  } catch (err: unknown) {
    console.error("❌ Erro fatal ao iniciar a API:", err);
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  startApiServer();
}
