import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import type { FastifyInstance } from "fastify";

vi.mock("@infrastructure/queue/serverQueueManager", () => ({
  addOrUpdateServerSchedule: vi.fn().mockResolvedValue(undefined),
  removeServerSchedule: vi.fn().mockResolvedValue(undefined),
  scheduleServerRetry: vi.fn().mockResolvedValue(undefined),
  triggerServerCheckNow: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@infrastructure/scraping/parsers/guildParser", () => ({
  getGuildMembers: vi.fn().mockResolvedValue([]),
}));

vi.mock("@shared/utils/urlSafety", () => ({
  assertPublicHttpUrl: vi.fn().mockResolvedValue(undefined),
  UnsafeUrlError: class UnsafeUrlError extends Error {},
}));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

describe("POST /api/servers — two guilds on the same domain", () => {
  let app: FastifyInstance;
  let sessionCookie: string;
  const email = `servers-int-${Date.now()}@example.com`;
  const password = "correct horse battery staple";
  const serverIdsToClean: string[] = [];

  beforeAll(async () => {
    const { buildFastifyServer } = await import("../../server");
    app = await buildFastifyServer();

    const { auth } = await import("@infrastructure/auth/auth");
    await auth.api.signUpEmail({ body: { email, password, name: "Servers Integration Test" } });
    await pool.query('UPDATE "user" SET "emailVerified" = true WHERE email = $1', [email]);

    const { headers } = await auth.api.signInEmail({
      body: { email, password },
      returnHeaders: true,
    });
    const setCookie = headers.get("set-cookie");
    if (!setCookie) throw new Error("Login não retornou cookie de sessão.");
    sessionCookie = setCookie.split(";")[0];
  });

  afterAll(async () => {
    const { deleteServerConfig } = await import("@infrastructure/storage/serverConfigManager");
    for (const serverId of serverIdsToClean) {
      await deleteServerConfig(serverId).catch(() => {});
    }
    await pool.query('DELETE FROM "user" WHERE email = $1', [email]);
    await pool.end();
    await app.close();
  });

  it("creates two separate entries instead of the second overwriting the first", async () => {
    const guildAUrl = "https://example.com/?subtopic=guilds&action=view&GuildName=Integration+Guild+A";
    const guildBUrl = "https://example.com/?subtopic=guilds&action=view&GuildName=Integration+Guild+B";

    const responseA = await app.inject({
      method: "POST",
      url: "/api/servers",
      headers: { cookie: sessionCookie },
      payload: { url: guildAUrl, name: "Integration Guild A" },
    });
    expect(responseA.statusCode).toBe(201);
    const serverA = responseA.json();
    serverIdsToClean.push(serverA.serverId);

    const responseB = await app.inject({
      method: "POST",
      url: "/api/servers",
      headers: { cookie: sessionCookie },
      payload: { url: guildBUrl, name: "Integration Guild B" },
    });
    expect(responseB.statusCode).toBe(201);
    const serverB = responseB.json();
    serverIdsToClean.push(serverB.serverId);

    expect(serverA.serverId).not.toBe(serverB.serverId);

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/servers",
      headers: { cookie: sessionCookie },
    });
    expect(listResponse.statusCode).toBe(200);
    const servers = listResponse.json() as Array<{
      serverId: string;
      serverName: string;
      guild: { url: string };
    }>;

    const foundA = servers.find((server) => server.serverId === serverA.serverId);
    const foundB = servers.find((server) => server.serverId === serverB.serverId);

    expect(foundA?.serverName).toBe("Integration Guild A");
    expect(foundB?.serverName).toBe("Integration Guild B");
    expect(foundA?.guild.url).toBe(guildAUrl);
    expect(foundB?.guild.url).toBe(guildBUrl);
  });
});
