import type { FastifyReply } from "fastify";
import { sendTestWebhook } from "@infrastructure/webhooks/webhook";

export const sendTestWebhookOrReply = async (webhookUrl: string, reply: FastifyReply): Promise<void> => {
  try {
    await sendTestWebhook(webhookUrl);
    reply.status(200).send({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao enviar webhook";
    reply.status(502).send({ error: `Falha ao enviar mensagem de teste: ${message}` });
  }
};
