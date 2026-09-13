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

export const getPasswordResetToken = async (pool: Pool, email: string): Promise<string> => {
  const userResult = await pool.query('SELECT id FROM "user" WHERE email = $1', [email]);
  const userId: string | undefined = userResult.rows[0]?.id;
  if (!userId) throw new Error(`No user found for email ${email}`);

  const tokenResult = await pool.query(
    `SELECT identifier FROM verification
     WHERE identifier LIKE 'reset-password:%' AND value = $1
     ORDER BY "createdAt" DESC LIMIT 1`,
    [userId]
  );
  const identifier: string | undefined = tokenResult.rows[0]?.identifier;
  if (!identifier) throw new Error(`No reset-password token found for ${email}`);

  return identifier.replace("reset-password:", "");
};
