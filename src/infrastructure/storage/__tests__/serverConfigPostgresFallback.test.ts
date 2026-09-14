import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { Pool } from "pg";
import type { ServerConfig } from "@shared/types/index";

const buildConfig = (serverId: string): ServerConfig => ({
  serverId,
  serverName: `Fallback Test ${serverId}`,
  guild: { url: `https://example.com/?guild=${serverId}`, enabled: true },
  characters: {},
});

describe("serverConfigManager: Postgres write-through and fallback", () => {
  let scratchDir: string;
  let realDatabaseUrl: string | undefined;
  let verifyPool: Pool;

  beforeAll(() => {
    scratchDir = mkdtempSync(path.join(tmpdir(), "ot-notifier-pg-fallback-"));
    realDatabaseUrl = process.env.DATABASE_URL;
    verifyPool = new Pool({ connectionString: realDatabaseUrl });
  });

  afterAll(async () => {
    process.env.DATABASE_URL = realDatabaseUrl;
    delete process.env.SERVER_STORAGE_DIR;
    await verifyPool.query('DELETE FROM "server_config" WHERE "serverId" LIKE $1', ["pgfallback_%"]);
    await verifyPool.end();
    rmSync(scratchDir, { recursive: true, force: true });
    vi.resetModules();
  });

  it("writes through to Postgres when it is reachable", async () => {
    process.env.SERVER_STORAGE_DIR = scratchDir;
    process.env.DATABASE_URL = realDatabaseUrl;
    vi.resetModules();
    const storage = await import("../serverConfigManager");

    const serverId = "pgfallback_normal";
    await storage.saveServerConfig(buildConfig(serverId));

    const row = await verifyPool.query('SELECT * FROM "server_config" WHERE "serverId" = $1', [serverId]);
    expect(row.rows).toHaveLength(1);
    expect(row.rows[0].serverName).toBe(`Fallback Test ${serverId}`);

    const fromDisk = storage.loadServerConfig(serverId);
    expect(fromDisk?.serverName).toBe(`Fallback Test ${serverId}`);
  });

  it("still saves and reads via the local file when Postgres is unreachable", async () => {
    const serverId = "pgfallback_down";
    process.env.SERVER_STORAGE_DIR = scratchDir;
    process.env.DATABASE_URL = "postgresql://baduser:badpass@127.0.0.1:59999/nonexistent";
    vi.resetModules();
    const storage = await import("../serverConfigManager");

    await expect(storage.saveServerConfig(buildConfig(serverId))).resolves.toBeUndefined();

    const fromDisk = storage.loadServerConfig(serverId);
    expect(fromDisk?.serverName).toBe(`Fallback Test ${serverId}`);

    process.env.DATABASE_URL = realDatabaseUrl;
    const row = await verifyPool.query('SELECT * FROM "server_config" WHERE "serverId" = $1', [serverId]);
    expect(row.rows).toHaveLength(0);
  });

  it("recovers a server whose local file is missing from Postgres", async () => {
    const serverId = "pgfallback_recover";
    await verifyPool.query(
      `INSERT INTO "server_config" ("serverId", "serverName", "guild", "characters") VALUES ($1, $2, $3, $4)`,
      [
        serverId,
        "Recovered From Postgres",
        JSON.stringify({ url: `https://example.com/?guild=${serverId}`, enabled: true }),
        JSON.stringify({}),
      ]
    );

    process.env.SERVER_STORAGE_DIR = scratchDir;
    process.env.DATABASE_URL = realDatabaseUrl;
    vi.resetModules();
    const storage = await import("../serverConfigManager");

    const all = await storage.getAllServerConfigs();
    expect(all.find((config) => config.serverId === serverId)?.serverName).toBe("Recovered From Postgres");

    const fromDisk = storage.loadServerConfig(serverId);
    expect(fromDisk?.serverName).toBe("Recovered From Postgres");
  });
});
