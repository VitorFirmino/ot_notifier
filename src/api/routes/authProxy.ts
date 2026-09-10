import type { FastifyInstance } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import type { auth } from "../../infrastructure/auth/auth.js";

export const registerAuthProxyRoute = (app: FastifyInstance, authInstance: typeof auth): void => {
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    handler: async (request, reply) => {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const headers = fromNodeHeaders(request.headers);
      headers.set("x-forwarded-for", request.ip);

      const authRequest = new Request(url.toString(), {
        method: request.method,
        headers,
        body:
          request.method === "GET" || request.method === "HEAD"
            ? undefined
            : JSON.stringify(request.body),
      });

      const response = await authInstance.handler(authRequest);

      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      return reply.send(response.body ? await response.text() : null);
    },
  });
};
