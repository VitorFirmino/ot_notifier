import type { FastifyReply } from "fastify";
import type { z } from "zod";
import { assertPublicHttpUrl, UnsafeUrlError } from "@shared/utils/urlSafety";

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

export const assertPublicUrlOrReply = async (
  url: string,
  reply: FastifyReply,
  invalidMessage = "URL inválida."
): Promise<boolean> => {
  try {
    await assertPublicHttpUrl(url);
    return true;
  } catch (err: unknown) {
    const message = err instanceof UnsafeUrlError ? err.message : invalidMessage;
    reply.status(400).send({ error: message });
    return false;
  }
};
