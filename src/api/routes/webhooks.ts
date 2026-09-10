import type { FastifyInstance } from "fastify";
import { assertPublicHttpUrl, UnsafeUrlError } from "@shared/utils/urlSafety";
import { sendTestWebhook } from "@infrastructure/webhooks/webhook";
import { parseOrReply } from "../validation";
import { testWebhookBodySchema } from "../schemas";

export const registerWebhookRoutes = (app: FastifyInstance): void => {
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
};
