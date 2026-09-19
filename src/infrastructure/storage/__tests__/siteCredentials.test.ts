import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Pool } from "pg";
import { saveSiteCredential, getSiteCredential, deleteSiteCredential } from "../siteCredentials";

describe("siteCredentials", () => {
  let verifyPool: Pool;
  const userId = "test-user-id";
  const domain = "ntoultimate-test.com.br";

  beforeAll(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY ??= "VmGlih2NDl1GQZ9W40PwUfncTWKne3Iyqaiymzw6aVo=";
    verifyPool = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  afterEach(async () => {
    await deleteSiteCredential(userId, domain);
  });

  afterAll(async () => {
    await verifyPool.end();
  });

  it("saves a credential with the password encrypted at rest", async () => {
    await saveSiteCredential({
      userId,
      domain,
      loginUrl: `https://${domain}/sub.php?page=login`,
      username: "deweda8045@duidir.com",
      password: "deweda@123",
    });

    const row = await verifyPool.query(
      'SELECT "encryptedPassword" FROM "site_credentials" WHERE "userId" = $1 AND "domain" = $2',
      [userId, domain]
    );
    expect(row.rows[0].encryptedPassword).not.toContain("deweda@123");
  });

  it("reads back the credential with the password decrypted", async () => {
    await saveSiteCredential({
      userId,
      domain,
      loginUrl: `https://${domain}/sub.php?page=login`,
      username: "deweda8045@duidir.com",
      password: "deweda@123",
    });

    const credential = await getSiteCredential(userId, domain);
    expect(credential).toEqual({
      userId,
      domain,
      loginUrl: `https://${domain}/sub.php?page=login`,
      username: "deweda8045@duidir.com",
      password: "deweda@123",
    });
  });

  it("returns null for a domain with no stored credential", async () => {
    expect(await getSiteCredential(userId, "no-credential-for-this.example.com")).toBeNull();
  });

  it("upserts on the same user+domain instead of duplicating", async () => {
    await saveSiteCredential({
      userId,
      domain,
      loginUrl: `https://${domain}/sub.php?page=login`,
      username: "first-user",
      password: "first-pass",
    });
    await saveSiteCredential({
      userId,
      domain,
      loginUrl: `https://${domain}/sub.php?page=login`,
      username: "second-user",
      password: "second-pass",
    });

    const rows = await verifyPool.query(
      'SELECT * FROM "site_credentials" WHERE "userId" = $1 AND "domain" = $2',
      [userId, domain]
    );
    expect(rows.rows).toHaveLength(1);
    expect((await getSiteCredential(userId, domain))?.username).toBe("second-user");
  });

  it("isolates credentials between different users on the same domain", async () => {
    const otherUserId = "other-user-id";
    await saveSiteCredential({
      userId,
      domain,
      loginUrl: `https://${domain}/sub.php?page=login`,
      username: "user-a",
      password: "pass-a",
    });

    expect(await getSiteCredential(otherUserId, domain)).toBeNull();

    await deleteSiteCredential(otherUserId, domain);
  });
});
