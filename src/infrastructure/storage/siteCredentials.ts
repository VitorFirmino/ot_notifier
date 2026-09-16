import { Pool } from "pg";
import { encryptSecret, decryptSecret } from "@infrastructure/auth/credentialEncryption";

let pool: Pool | null = null;

const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  }
  return pool;
};

export interface SiteCredential {
  userId: string;
  domain: string;
  loginUrl: string;
  username: string;
  password: string;
}

type SiteCredentialRow = {
  userId: string;
  domain: string;
  loginUrl: string;
  username: string;
  encryptedPassword: string;
};

export const saveSiteCredential = async (credential: SiteCredential): Promise<void> => {
  await getPool().query(
    `INSERT INTO "site_credentials" ("userId", "domain", "loginUrl", "username", "encryptedPassword", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT ("userId", "domain") DO UPDATE SET
       "loginUrl" = EXCLUDED."loginUrl",
       "username" = EXCLUDED."username",
       "encryptedPassword" = EXCLUDED."encryptedPassword",
       "updatedAt" = now()`,
    [
      credential.userId,
      credential.domain,
      credential.loginUrl,
      credential.username,
      encryptSecret(credential.password),
    ]
  );
};

export const getSiteCredential = async (userId: string, domain: string): Promise<SiteCredential | null> => {
  const result = await getPool().query<SiteCredentialRow>(
    `SELECT "userId", "domain", "loginUrl", "username", "encryptedPassword" FROM "site_credentials" WHERE "userId" = $1 AND "domain" = $2`,
    [userId, domain]
  );
  const row = result.rows[0];
  if (!row) return null;

  return {
    userId: row.userId,
    domain: row.domain,
    loginUrl: row.loginUrl,
    username: row.username,
    password: decryptSecret(row.encryptedPassword),
  };
};

export const deleteSiteCredential = async (userId: string, domain: string): Promise<void> => {
  await getPool().query(`DELETE FROM "site_credentials" WHERE "userId" = $1 AND "domain" = $2`, [userId, domain]);
};
