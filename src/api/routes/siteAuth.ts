import type { FastifyInstance } from "fastify";
import { playwrightManager } from "@infrastructure/scraping/playwrightManager";
import { saveSiteCredential } from "@infrastructure/storage/siteCredentials";
import { assertPublicUrlOrReply, parseOrReply } from "../validation";
import { siteLoginBodySchema } from "../schemas";
import { sendSuccess, sendError } from "../responseHelpers";

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
        return sendError(reply, 401, "Usuário ou senha incorretos.");
      }

      await saveSiteCredential({
        userId: request.userId!,
        domain,
        loginUrl: body.loginUrl,
        username: body.username,
        password: body.password,
      });
      return sendSuccess(reply, { domain });
    } catch (err: unknown) {
      console.error(`❌ Erro ao efetuar login em ${domain}:`, err);
      return sendError(reply, 500, "Erro ao efetuar login no site.");
    }
  });
};
