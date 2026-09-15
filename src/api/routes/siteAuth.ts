import type { FastifyInstance } from "fastify";
import { playwrightManager } from "@infrastructure/scraping/playwrightManager";
import { saveSiteCredential } from "@infrastructure/storage/siteCredentials";
import { assertPublicUrlOrReply, parseOrReply } from "../validation";
import { siteLoginBodySchema } from "../schemas";

interface SiteLoginPayload {
  loginUrl: string;
  username: string;
  password: string;
}

export const registerSiteAuthRoutes = (app: FastifyInstance): void => {
  app.post<{ Body: SiteLoginPayload }>("/api/site-auth/login", async (request, reply) => {
    const body = parseOrReply(siteLoginBodySchema, request.body, reply);
    if (!body) return;

    if (!(await assertPublicUrlOrReply(body.loginUrl, reply, "URL de login inválida."))) return;

    const domain = new URL(body.loginUrl).hostname;

    try {
      const success = await playwrightManager.performLogin(body.loginUrl, body.username, body.password);
      if (!success) {
        return reply.status(401).send({ error: "Usuário ou senha incorretos." });
      }

      await saveSiteCredential({ domain, loginUrl: body.loginUrl, username: body.username, password: body.password });
      return reply.status(200).send({ success: true, domain });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao efetuar login no site";
      return reply.status(500).send({ error: message });
    }
  });
};
