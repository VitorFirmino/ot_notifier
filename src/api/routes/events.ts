import type { FastifyInstance } from "fastify";
import { getRecentEvents } from "@infrastructure/events/eventLog";

export const registerEventRoutes = (app: FastifyInstance): void => {
  app.get<{ Querystring: { limit?: string } }>("/api/events", async (request, reply) => {
    const limit = Number.parseInt(request.query.limit ?? "50", 10);
    const events = await getRecentEvents(Number.isFinite(limit) && limit > 0 ? limit : 50);
    return reply.status(200).send(events);
  });
};
