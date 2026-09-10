import type { FastifyInstance } from "fastify";
import { sendTestWebhookOrReply } from "./webhookTestHelper";
import { assertPublicUrlOrReply, parseOrReply } from "../validation";
import { testWebhookBodySchema } from "../schemas";

export const registerWebhookRoutes = (app: FastifyInstance): void => {
  app.post<{ Body: { webhookUrl?: string } }>("/api/test-webhook", async (request, reply) => {
    const body = parseOrReply(testWebhookBodySchema, request.body, reply);
    if (!body) return;
    const webhookUrl = body.webhookUrl;

    if (!(await assertPublicUrlOrReply(webhookUrl, reply, "URL de webhook inválida."))) return;

    await sendTestWebhookOrReply(webhookUrl, reply);
  });
};
