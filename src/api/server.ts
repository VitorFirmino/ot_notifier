import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import dotenv from "dotenv";
import { fromNodeHeaders } from "better-auth/node";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";
import { getServerCheckQueue } from "../infrastructure/queue/serverQueueManager.js";
import { getAuthEnv } from "../shared/utils/authEnv.js";
import { registerAuthProxyRoute } from "./routes/authProxy.js";
import { registerServerRoutes } from "./routes/servers.js";
import { registerWebhookRoutes } from "./routes/webhooks.js";
import { registerEventRoutes } from "./routes/events.js";
import { registerStatsRoutes } from "./routes/stats.js";
import { registerDiscoverRoutes } from "./routes/discover.js";
import { registerProxyImageRoutes } from "./routes/proxyImage.js";
import { registerCharacterRoutes } from "./routes/character.js";

dotenv.config({ quiet: true });

const PORT = process.env.API_PORT ? parseInt(process.env.API_PORT, 10) : 3001;

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

export const buildFastifyServer = async () => {
  const { auth } = await import("../infrastructure/auth/auth.js");

  const app = Fastify({
    logger: false,
  });

  app.register(cors, {
    origin: process.env.DASHBOARD_URL ?? "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  });

  app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
  });

  const { ADMIN_EMAILS } = getAuthEnv();
  const adminEmails = new Set(
    (ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );

  app.addHook("onRequest", async (request, reply) => {
    if (request.method === "OPTIONS" || request.url.startsWith("/api/auth/")) {
      return;
    }

    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) {
      return reply.status(401).send({ error: "Não autenticado." });
    }
    request.userId = session.user.id;

    if (request.url.startsWith("/admin/queues") && !adminEmails.has(session.user.email.toLowerCase())) {
      return reply.status(403).send({ error: "Você não tem permissão para acessar o painel de filas." });
    }
  });

  registerAuthProxyRoute(app, auth);

  try {
    const serverAdapter = new FastifyAdapter();
    createBullBoard({
      queues: [new BullMQAdapter(getServerCheckQueue())],
      serverAdapter: serverAdapter as any,
    });
    serverAdapter.setBasePath("/admin/queues");
    app.register(serverAdapter.registerPlugin(), {
      prefix: "/admin/queues",
    });
    console.log("📊 [Bull-Board] Painel de Filas ativado na rota /admin/queues");
  } catch (err: unknown) {
    console.warn("⚠️ Não foi possível inicializar o painel Bull-Board:", err);
  }

  registerServerRoutes(app);
  registerWebhookRoutes(app);
  registerEventRoutes(app);
  registerStatsRoutes(app);
  registerDiscoverRoutes(app);
  registerProxyImageRoutes(app);
  registerCharacterRoutes(app);

  return app;
};

export const startApiServer = async () => {
  try {
    const { AppDataSource } = await import("../infrastructure/database/dataSource.js");
    await AppDataSource.initialize();
    console.log("🐘 [TypeORM] Conectado ao PostgreSQL.");

    const app = await buildFastifyServer();
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 Fastify REST API ativa em http://localhost:${PORT}`);
    console.log(`📊 Painel Bull-Board ativo em http://localhost:${PORT}/admin/queues`);
  } catch (err: unknown) {
    console.error("❌ Erro fatal ao iniciar a API:", err);
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  startApiServer();
}
