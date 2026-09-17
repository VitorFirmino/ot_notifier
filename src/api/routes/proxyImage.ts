import type { FastifyInstance } from "fastify";
import { fetchImageProxied } from "@infrastructure/scraping/utils/imageProxy";
import { assertPublicUrlOrReply, parseOrReply } from "../validation";
import { proxyImageQuerySchema } from "../schemas";
import { sendError } from "../responseHelpers";

const ALLOWED_PROXIED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"];

export const registerProxyImageRoutes = (app: FastifyInstance): void => {
  app.get<{ Querystring: { url?: string } }>("/api/proxy-image", async (request, reply) => {
    const query = parseOrReply(proxyImageQuerySchema, request.query, reply);
    if (!query) return;
    const rawUrl = query.url;

    if (!(await assertPublicUrlOrReply(rawUrl, reply))) return;

    try {
      const image = await fetchImageProxied(rawUrl);
      if (!image) {
        return sendError(reply, 502, "Não foi possível obter a imagem da URL informada.");
      }
      const contentType = image.contentType.split(";")[0].trim().toLowerCase();
      if (!ALLOWED_PROXIED_IMAGE_TYPES.includes(contentType)) {
        return sendError(reply, 415, "Tipo de imagem não suportado.");
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
      return sendError(reply, 500, message);
    }
  });
};
