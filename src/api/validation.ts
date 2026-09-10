import type { FastifyReply } from "fastify";
import type { z } from "zod";

export const parseOrReply = <T>(
  schema: z.ZodType<T>,
  data: unknown,
  reply: FastifyReply
): T | null => {
  const result = schema.safeParse(data);
  if (!result.success) {
    reply.status(400).send({ error: result.error.issues[0]?.message ?? "Dados inválidos." });
    return null;
  }
  return result.data;
};
