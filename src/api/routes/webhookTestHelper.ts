import type { FastifyReply } from "fastify";
import { sendTestWebhook } from "@infrastructure/webhooks/webhook";
import { sendSuccess, sendError } from "../responseHelpers";

export const sendTestWebhookOrReply = async (webhookUrl: string, reply: FastifyReply): Promise<void> => {
  try {
    await sendTestWebhook(webhookUrl);
    sendSuccess(reply, null);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao enviar webhook";
    sendError(reply, 502, `Falha ao enviar mensagem de teste: ${message}`);
  }
};
