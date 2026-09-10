import type { FastifyInstance } from "fastify";
import { fetchImageProxied } from "@infrastructure/scraping/utils/imageProxy";
import { assertPublicHttpUrl, UnsafeUrlError } from "@shared/utils/urlSafety";
import { parseOrReply } from "../validation";
import { proxyImageQuerySchema } from "../schemas";

const ALLOWED_PROXIED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"];

export const registerProxyImageRoutes = (app: FastifyInstance): void => {
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
};
