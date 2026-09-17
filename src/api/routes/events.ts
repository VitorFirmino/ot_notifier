import type { FastifyInstance } from "fastify";
import { getRecentEvents } from "@infrastructure/events/eventLog";
import { getAllServerConfigs } from "@infrastructure/storage/serverConfigManager";
import { sendSuccess } from "../responseHelpers";

export const registerEventRoutes = (app: FastifyInstance): void => {
  app.get<{ Querystring: { limit?: string } }>("/api/events", async (request, reply) => {
    const limit = Number.parseInt(request.query.limit ?? "50", 10);
    const events = await getRecentEvents(Number.isFinite(limit) && limit > 0 ? limit : 50);

    if (request.isAdmin) {
      return sendSuccess(reply, events);
    }

    const configs = await getAllServerConfigs();
    const ownedServerIds = new Set(
      configs.filter((config) => config.createdByUserId === request.userId).map((config) => config.serverId)
    );
    return sendSuccess(reply, events.filter((event) => ownedServerIds.has(event.serverId)));
  });
};
