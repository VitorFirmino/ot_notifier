import { Pool } from "pg";
import type { ServerConfig } from "@shared/types/index";

let pool: Pool | null = null;

const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  }
  return pool;
};

type ServerConfigRow = {
  serverId: string;
  serverName: string;
  guild: ServerConfig["guild"];
  characters: ServerConfig["characters"];
  settings: ServerConfig["settings"] | null;
  createdByUserId: string | null;
  isWorking: boolean | null;
  lastWorkingTest: Date | null;
  hasCloudflare: boolean | null;
  cloudflareDetectedAt: Date | null;
  updatedAt: Date;
};

const rowToServerConfig = (row: ServerConfigRow): ServerConfig => ({
  serverId: row.serverId,
  serverName: row.serverName,
  guild: row.guild,
  characters: row.characters,
  lastUpdate: row.updatedAt.toISOString(),
  ...(row.settings ? { settings: row.settings } : {}),
  ...(row.createdByUserId ? { createdByUserId: row.createdByUserId } : {}),
  ...(row.isWorking !== null ? { isWorking: row.isWorking } : {}),
  ...(row.lastWorkingTest ? { lastWorkingTest: row.lastWorkingTest.toISOString() } : {}),
  ...(row.hasCloudflare !== null ? { hasCloudflare: row.hasCloudflare } : {}),
  ...(row.cloudflareDetectedAt ? { cloudflareDetectedAt: row.cloudflareDetectedAt.toISOString() } : {}),
});

export const upsertServerConfigToPostgres = async (config: ServerConfig): Promise<void> => {
  await getPool().query(
    `INSERT INTO "server_config"
       ("serverId", "serverName", "guild", "characters", "settings", "createdByUserId", "isWorking", "lastWorkingTest", "hasCloudflare", "cloudflareDetectedAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     ON CONFLICT ("serverId") DO UPDATE SET
       "serverName" = EXCLUDED."serverName",
       "guild" = EXCLUDED."guild",
       "characters" = EXCLUDED."characters",
       "settings" = EXCLUDED."settings",
       "createdByUserId" = EXCLUDED."createdByUserId",
       "isWorking" = EXCLUDED."isWorking",
       "lastWorkingTest" = EXCLUDED."lastWorkingTest",
       "hasCloudflare" = EXCLUDED."hasCloudflare",
       "cloudflareDetectedAt" = EXCLUDED."cloudflareDetectedAt",
       "updatedAt" = now()`,
    [
      config.serverId,
      config.serverName,
      JSON.stringify(config.guild),
      JSON.stringify(config.characters ?? {}),
      config.settings ? JSON.stringify(config.settings) : null,
      config.createdByUserId ?? null,
      config.isWorking ?? null,
      config.lastWorkingTest ?? null,
      config.hasCloudflare ?? null,
      config.cloudflareDetectedAt ?? null,
    ]
  );
};

export const deleteServerConfigFromPostgres = async (serverId: string): Promise<void> => {
  await getPool().query(`DELETE FROM "server_config" WHERE "serverId" = $1`, [serverId]);
};

export const getAllServerConfigsFromPostgres = async (): Promise<ServerConfig[]> => {
  const result = await getPool().query<ServerConfigRow>(`SELECT * FROM "server_config"`);
  return result.rows.map(rowToServerConfig);
};
