import path from "node:path";
import { config as loadEnv } from "dotenv";
import { Pool } from "pg";

loadEnv({ path: path.resolve(import.meta.dirname, "../../../.env"), quiet: true });

export const createPool = (): Pool => new Pool({ connectionString: process.env.DATABASE_URL });

export const uniqueTestEmail = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

export const markEmailVerified = async (pool: Pool, email: string): Promise<void> => {
  await pool.query('UPDATE "user" SET "emailVerified" = true WHERE email = $1', [email]);
};

export const deleteTestUser = async (pool: Pool, email: string): Promise<void> => {
  await pool.query('DELETE FROM "user" WHERE email = $1', [email]);
};
