import type { FastifyInstance } from "fastify";
import {
  getAllServerConfigs,
  saveServerConfig,
  loadServerConfig,
  updateServerConfig,
  extractServerIdFromUrl,
  updateServerCharacters,
  deleteServerConfig,
  updateServerWorkingStatus,
} from "@infrastructure/storage/serverConfigManager";
import { getGuildMembers } from "@infrastructure/scraping/parsers/guildParser";
import { getWebhookUrl } from "@application/workers/utils/webhookUtils";
import { getAllServerStates } from "@shared/utils/serverStateManager";
import {
  addOrUpdateServerSchedule,
  removeServerSchedule,
  scheduleServerRetry,
  triggerServerCheckNow,
} from "@infrastructure/queue/serverQueueManager";
import {
  clearProcessingState,
  clearVerifyingState,
} from "@shared/utils/serverStateManager";
import type { AddServerPayload, UpdateServerPayload, CharacterInfo } from "@shared/types/index";
import { assertPublicUrlOrReply, parseOrReply } from "../validation";
import { addServerBodySchema, updateServerBodySchema } from "../schemas";
import { sendTestWebhookOrReply } from "./webhookTestHelper";

interface ServerParams {
  id: string;
}

const createBlankCharacter = (url: string): CharacterInfo => ({
  url,
  last_level: null,
  up_streak: 0,
  last_milestone: 0,
  last_death: null,
});

export const registerServerRoutes = (app: FastifyInstance): void => {
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

  app.post<{ Body: AddServerPayload }>("/api/servers", async (request, reply) => {
    const body = parseOrReply(addServerBodySchema, request.body, reply);
    if (!body) return;
    const { url, name, webhookUrl, logoUrl, kills, world } = body;

    if (!(await assertPublicUrlOrReply(url, reply))) return;

    const serverId = extractServerIdFromUrl(url);

    const addResult: { outcome: "forbidden" | "conflict" | "ok"; conflictMessage: string } = {
      outcome: "ok",
      conflictMessage: "",
    };
    const newConfig = await updateServerConfig(serverId, (existingConfig) => {
      if (existingConfig && !existingConfig.createdByUserId && !request.isAdmin) {
        addResult.outcome = "forbidden";
        return null;
      }
      if (existingConfig?.createdByUserId && existingConfig.createdByUserId !== request.userId) {
        addResult.outcome = "forbidden";
        return null;
      }

      if (existingConfig?.guild.url) {
        try {
          if (new URL(existingConfig.guild.url).origin !== new URL(url).origin) {
            addResult.outcome = "conflict";
            addResult.conflictMessage = `O identificador "${serverId}" já está em uso por outro servidor (${existingConfig.serverName}). Use uma URL com um domínio diferente ou remova o servidor existente primeiro.`;
            return null;
          }
        } catch (err: unknown) {
          console.warn(`⚠️ [${serverId}] Falha ao comparar URLs de servidor existente:`, err);
        }
      }

      return {
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
    });

    if (addResult.outcome === "forbidden") {
      return reply.status(403).send({ error: "Você não tem permissão para modificar este servidor." });
    }
    if (addResult.outcome === "conflict") {
      return reply.status(409).send({ error: addResult.conflictMessage });
    }
    if (!newConfig) {
      return reply.status(500).send({ error: "Erro ao criar o servidor." });
    }

    if (Object.keys(newConfig.characters).length === 0) {
      try {
        const members = await getGuildMembers(url);
        const charsObj: Record<string, CharacterInfo> = {};
        members.forEach((member) => {
          charsObj[member.name] = createBlankCharacter(member.url);
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

    if (!(await assertPublicUrlOrReply(config.guild.url, reply))) return;

    try {
      const members = await getGuildMembers(config.guild.url);
      const updatedChars = { ...config.characters };

      members.forEach((member) => {
        if (!updatedChars[member.name]) {
          updatedChars[member.name] = createBlankCharacter(member.url);
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

    if (!(await assertPublicUrlOrReply(webhookUrl, reply, "URL de webhook inválida."))) return;

    await sendTestWebhookOrReply(webhookUrl, reply);
  });

  app.put<{ Params: ServerParams; Body: UpdateServerPayload }>(
    "/api/servers/:id",
    async (request, reply) => {
      const { id: serverId } = request.params;

      const body = parseOrReply(updateServerBodySchema, request.body ?? {}, reply);
      if (!body) return;

      if (body.guild?.url && !(await assertPublicUrlOrReply(body.guild.url, reply))) return;

      const updateResult: { outcome: "not_found" | "forbidden" | "ok" } = { outcome: "not_found" };
      const updated = await updateServerConfig(serverId, (existing) => {
        if (!existing) {
          updateResult.outcome = "not_found";
          return null;
        }
        if (!existing.createdByUserId && !request.isAdmin) {
          updateResult.outcome = "forbidden";
          return null;
        }
        if (existing.createdByUserId && existing.createdByUserId !== request.userId) {
          updateResult.outcome = "forbidden";
          return null;
        }
        updateResult.outcome = "ok";
        return {
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
      });

      if (updateResult.outcome === "not_found") {
        return reply.status(404).send({ error: "Servidor não encontrado" });
      }
      if (updateResult.outcome === "forbidden") {
        return reply.status(403).send({ error: "Você não tem permissão para editar este servidor." });
      }
      if (!updated) {
        return reply.status(500).send({ error: "Erro ao atualizar o servidor." });
      }

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
    if (existing.createdByUserId !== request.userId && !request.isAdmin) {
      return reply.status(403).send({ error: "Você não tem permissão para remover este servidor." });
    }

    await deleteServerConfig(serverId);
    await removeServerSchedule(serverId);
    return reply.status(200).send({ success: true, message: `Servidor ${serverId} removido` });
  });
};
