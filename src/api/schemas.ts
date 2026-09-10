import { z } from "zod";

const requiredString = (message: string) => z.string({ error: message }).min(1, message);
const optionalString = z.string({ error: "Valor inválido." }).optional();
const optionalNumber = z.number({ error: "Valor deve ser numérico." }).optional();
const optionalBoolean = z.boolean({ error: "Valor deve ser verdadeiro ou falso." }).optional();

const settingsSchema = z
  .object({
    concurrency: optionalNumber,
    checkInterval: optionalNumber,
    idleCheckInterval: optionalNumber,
    emptyGuildCheckInterval: optionalNumber,
    protectedCheckInterval: optionalNumber,
    requestDelay: optionalNumber,
    batchSize: optionalNumber,
    headers: z.record(z.string(), z.string()).optional(),
  })
  .partial();

const guildConfigPartialSchema = z
  .object({
    url: optionalString,
    webhookUrl: optionalString,
    enabled: optionalBoolean,
    logoUrl: optionalString,
    emblemUrl: optionalString,
    kills: optionalString,
    world: optionalString,
  })
  .partial();

export const testWebhookBodySchema = z.object({
  webhookUrl: z
    .string({ error: "Informe a URL do webhook." })
    .trim()
    .min(1, "Informe a URL do webhook."),
});

export const discoverGuildsBodySchema = z.object({
  url: requiredString("URL é obrigatória."),
});

export const proxyImageQuerySchema = z.object({
  url: requiredString("URL é obrigatória."),
});

export const addServerBodySchema = z.object({
  url: requiredString("URL é obrigatória."),
  name: optionalString,
  webhookUrl: optionalString,
  logoUrl: optionalString,
  kills: optionalString,
  world: optionalString,
});

export const updateServerBodySchema = z.object({
  serverName: optionalString,
  enabled: optionalBoolean,
  webhookUrl: optionalString,
  logoUrl: optionalString,
  guild: guildConfigPartialSchema.optional(),
  settings: settingsSchema.optional(),
});

export const inspectCharacterBodySchema = z.object({
  name: requiredString("Nome do personagem é obrigatório."),
  url: optionalString,
  serverId: optionalString,
});
