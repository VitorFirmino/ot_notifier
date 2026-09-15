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
  domain: string;
  loginUrl: string;
  username: string;
  password: string;
}

type SiteCredentialRow = {
  domain: string;
  loginUrl: string;
  username: string;
  encryptedPassword: string;
};

export const saveSiteCredential = async (credential: SiteCredential): Promise<void> => {
  await getPool().query(
    `INSERT INTO "site_credentials" ("domain", "loginUrl", "username", "encryptedPassword", "updatedAt")
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT ("domain") DO UPDATE SET
       "loginUrl" = EXCLUDED."loginUrl",
       "username" = EXCLUDED."username",
       "encryptedPassword" = EXCLUDED."encryptedPassword",
       "updatedAt" = now()`,
    [credential.domain, credential.loginUrl, credential.username, encryptSecret(credential.password)]
  );
};

export const getSiteCredential = async (domain: string): Promise<SiteCredential | null> => {
  const result = await getPool().query<SiteCredentialRow>(
    `SELECT "domain", "loginUrl", "username", "encryptedPassword" FROM "site_credentials" WHERE "domain" = $1`,
    [domain]
  );
  const row = result.rows[0];
  if (!row) return null;

  return {
    domain: row.domain,
    loginUrl: row.loginUrl,
    username: row.username,
    password: decryptSecret(row.encryptedPassword),
  };
};

export const deleteSiteCredential = async (domain: string): Promise<void> => {
  await getPool().query(`DELETE FROM "site_credentials" WHERE "domain" = $1`, [domain]);
};
