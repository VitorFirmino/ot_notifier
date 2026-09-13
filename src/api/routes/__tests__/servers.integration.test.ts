import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import type { FastifyInstance } from "fastify";
import { createVerifiedUserSession, deleteTestUser, type TestSession } from "./testAuthHelpers";

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

afterAll(async () => {
  await pool.end();
});

type ServerListItem = { serverId: string; serverName: string; guild: { url: string } };

describe("POST /api/servers — two guilds on the same domain", () => {
  let app: FastifyInstance;
  let session: TestSession;
  const serverIdsToClean: string[] = [];

  beforeAll(async () => {
    const { buildFastifyServer } = await import("../../server");
    app = await buildFastifyServer();
    session = await createVerifiedUserSession(pool, "servers-int");
  });

  afterAll(async () => {
    const { deleteServerConfig } = await import("@infrastructure/storage/serverConfigManager");
    for (const serverId of serverIdsToClean) {
      await deleteServerConfig(serverId).catch(() => {});
    }
    await deleteTestUser(pool, session.email);
    await app.close();
  });

  it("creates two separate entries instead of the second overwriting the first", async () => {
    const guildAUrl = "https://example.com/?subtopic=guilds&action=view&GuildName=Integration+Guild+A";
    const guildBUrl = "https://example.com/?subtopic=guilds&action=view&GuildName=Integration+Guild+B";

    const responseA = await app.inject({
      method: "POST",
      url: "/api/servers",
      headers: { cookie: session.sessionCookie },
      payload: { url: guildAUrl, name: "Integration Guild A" },
    });
    expect(responseA.statusCode).toBe(201);
    const serverA = responseA.json();
    serverIdsToClean.push(serverA.serverId);

    const responseB = await app.inject({
      method: "POST",
      url: "/api/servers",
      headers: { cookie: session.sessionCookie },
      payload: { url: guildBUrl, name: "Integration Guild B" },
    });
    expect(responseB.statusCode).toBe(201);
    const serverB = responseB.json();
    serverIdsToClean.push(serverB.serverId);

    expect(serverA.serverId).not.toBe(serverB.serverId);

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/servers",
      headers: { cookie: session.sessionCookie },
    });
    expect(listResponse.statusCode).toBe(200);
    const servers = listResponse.json() as ServerListItem[];

    const foundA = servers.find((server) => server.serverId === serverA.serverId);
    const foundB = servers.find((server) => server.serverId === serverB.serverId);

    expect(foundA?.serverName).toBe("Integration Guild A");
    expect(foundB?.serverName).toBe("Integration Guild B");
    expect(foundA?.guild.url).toBe(guildAUrl);
    expect(foundB?.guild.url).toBe(guildBUrl);
  });
});

describe("Server ownership isolation", () => {
  let app: FastifyInstance;
  let owner: TestSession;
  let intruder: TestSession;
  let ownedServerId: string;

  beforeAll(async () => {
    const { buildFastifyServer } = await import("../../server");
    app = await buildFastifyServer();
    owner = await createVerifiedUserSession(pool, "owner");
    intruder = await createVerifiedUserSession(pool, "intruder");

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/servers",
      headers: { cookie: owner.sessionCookie },
      payload: {
        url: "https://example.com/?subtopic=guilds&action=view&GuildName=Owned+By+Owner",
        name: "Owned By Owner",
      },
    });
    expect(createResponse.statusCode).toBe(201);
    ownedServerId = createResponse.json().serverId;
  });

  afterAll(async () => {
    const { deleteServerConfig } = await import("@infrastructure/storage/serverConfigManager");
    await deleteServerConfig(ownedServerId).catch(() => {});
    await deleteTestUser(pool, owner.email);
    await deleteTestUser(pool, intruder.email);
    await app.close();
  });

  it("does not show the owner's server in another user's list", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/servers",
      headers: { cookie: intruder.sessionCookie },
    });
    const servers = response.json() as ServerListItem[];
    expect(servers.find((server) => server.serverId === ownedServerId)).toBeUndefined();
  });

  it("shows the server in the owner's own list", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/servers",
      headers: { cookie: owner.sessionCookie },
    });
    const servers = response.json() as ServerListItem[];
    expect(servers.find((server) => server.serverId === ownedServerId)).toBeDefined();
  });

  it("does not count the owner's server in another user's stats", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/stats",
      headers: { cookie: intruder.sessionCookie },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().totalServers).toBe(0);
  });

  it("blocks a non-owner from syncing the server", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/servers/${ownedServerId}/sync`,
      headers: { cookie: intruder.sessionCookie },
    });
    expect(response.statusCode).toBe(403);
  });

  it("blocks a non-owner from testing the server's webhook", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/servers/${ownedServerId}/test-webhook`,
      headers: { cookie: intruder.sessionCookie },
    });
    expect(response.statusCode).toBe(403);
  });

  it("blocks a non-owner from updating the server", async () => {
    const response = await app.inject({
      method: "PUT",
      url: `/api/servers/${ownedServerId}`,
      headers: { cookie: intruder.sessionCookie },
      payload: { serverName: "Hijacked" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("blocks a non-owner from deleting the server", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/api/servers/${ownedServerId}`,
      headers: { cookie: intruder.sessionCookie },
    });
    expect(response.statusCode).toBe(403);
  });

  it("allows the owner to update their own server", async () => {
    const response = await app.inject({
      method: "PUT",
      url: `/api/servers/${ownedServerId}`,
      headers: { cookie: owner.sessionCookie },
      payload: { serverName: "Renamed By Owner" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().serverName).toBe("Renamed By Owner");
  });

  it("allows the owner to delete their own server", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/api/servers/${ownedServerId}`,
      headers: { cookie: owner.sessionCookie },
    });
    expect(response.statusCode).toBe(200);

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/servers",
      headers: { cookie: owner.sessionCookie },
    });
    const servers = listResponse.json() as ServerListItem[];
    expect(servers.find((server) => server.serverId === ownedServerId)).toBeUndefined();
  });
});

describe("Admin visibility", () => {
  let app: FastifyInstance;
  let admin: TestSession;
  let regularUser: TestSession;
  let regularUserServerId: string;
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  beforeAll(async () => {
    regularUser = await createVerifiedUserSession(pool, "regular-user");
    admin = await createVerifiedUserSession(pool, "admin-user");

    process.env.ADMIN_EMAILS = admin.email;
    const { buildFastifyServer } = await import("../../server");
    app = await buildFastifyServer();

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/servers",
      headers: { cookie: regularUser.sessionCookie },
      payload: {
        url: "https://example.com/?subtopic=guilds&action=view&GuildName=Regular+Owned",
        name: "Regular Owned",
      },
    });
    expect(createResponse.statusCode).toBe(201);
    regularUserServerId = createResponse.json().serverId;
  });

  afterAll(async () => {
    process.env.ADMIN_EMAILS = originalAdminEmails;
    const { deleteServerConfig } = await import("@infrastructure/storage/serverConfigManager");
    await deleteServerConfig(regularUserServerId).catch(() => {});
    await deleteTestUser(pool, regularUser.email);
    await deleteTestUser(pool, admin.email);
    await app.close();
  });

  it("lets the admin see a server they don't own", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/servers",
      headers: { cookie: admin.sessionCookie },
    });
    const servers = response.json() as ServerListItem[];
    expect(servers.find((server) => server.serverId === regularUserServerId)).toBeDefined();
  });

  it("lets the admin sync a server they don't own", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/servers/${regularUserServerId}/sync`,
      headers: { cookie: admin.sessionCookie },
    });
    expect(response.statusCode).not.toBe(403);
  });
});
