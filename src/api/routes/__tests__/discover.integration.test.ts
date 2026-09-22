import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { Pool } from "pg";
import type { FastifyInstance } from "fastify";
import { createVerifiedUserSession, deleteTestUser, type TestSession } from "./testAuthHelpers";

const discoverGuildRoute = vi.fn();

vi.mock("@infrastructure/scraping/utils/guildRouteDiscovery", async () => {
  const actual = await vi.importActual<typeof import("@infrastructure/scraping/utils/guildRouteDiscovery")>(
    "@infrastructure/scraping/utils/guildRouteDiscovery"
  );
  return { ...actual, discoverGuildRoute };
});

vi.mock("@shared/utils/urlSafety", () => ({
  assertPublicHttpUrl: vi.fn().mockResolvedValue(undefined),
  UnsafeUrlError: class UnsafeUrlError extends Error {},
}));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

afterAll(async () => {
  await pool.end();
});

describe("POST /api/discover — caching", () => {
  let app: FastifyInstance;
  let session: TestSession;
  const targetUrl = `https://discover-cache-test-${Date.now()}.example.com`;

  beforeAll(async () => {
    const { buildFastifyServer } = await import("../../server");
    app = await buildFastifyServer();
    session = await createVerifiedUserSession(pool, "discover-cache");

    const { getCacheRedisClient } = await import("@infrastructure/queue/redisConnection");
    const redis = await getCacheRedisClient();
    await redis?.del(`discover-cache:${targetUrl}/`);
  });

  afterAll(async () => {
    await deleteTestUser(pool, session.email);
  });

  beforeEach(() => {
    discoverGuildRoute.mockClear();
  });

  it("reuses a cached result instead of scraping again", async () => {
    discoverGuildRoute.mockResolvedValue({
      guilds: [{ name: "Cached Guild", url: `${targetUrl}/guild`, logoUrl: undefined }],
      html: "<html></html>",
      worldOptions: [],
      looksLikeServer: true,
    });

    const first = await app.inject({
      method: "POST",
      url: "/api/discover",
      headers: { cookie: session.sessionCookie },
      payload: { url: targetUrl },
    });
    expect(first.statusCode).toBe(200);
    expect(discoverGuildRoute).toHaveBeenCalledTimes(1);

    const second = await app.inject({
      method: "POST",
      url: "/api/discover",
      headers: { cookie: session.sessionCookie },
      payload: { url: targetUrl },
    });
    expect(second.statusCode).toBe(200);
    expect(discoverGuildRoute).toHaveBeenCalledTimes(1);
    expect(JSON.parse(second.body).data.guilds).toEqual(JSON.parse(first.body).data.guilds);
  });

  it("does not cache a result with no guilds and no worlds to pick from", async () => {
    const emptyUrl = `${targetUrl}/empty`;
    discoverGuildRoute.mockResolvedValue({
      guilds: [],
      html: "<html></html>",
      worldOptions: [],
      looksLikeServer: false,
    });

    await app.inject({
      method: "POST",
      url: "/api/discover",
      headers: { cookie: session.sessionCookie },
      payload: { url: emptyUrl },
    });
    await app.inject({
      method: "POST",
      url: "/api/discover",
      headers: { cookie: session.sessionCookie },
      payload: { url: emptyUrl },
    });

    expect(discoverGuildRoute).toHaveBeenCalledTimes(2);
  });
});
