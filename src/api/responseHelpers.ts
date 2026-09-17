import type { FastifyReply } from "fastify";

export const sendSuccess = <T>(reply: FastifyReply, data: T, status = 200): void => {
  reply.status(status).send({ success: true, data });
};

export const sendError = (
  reply: FastifyReply,
  status: number,
  error: string,
  extra?: Record<string, unknown>
): void => {
  reply.status(status).send({ success: false, error, ...extra });
};
