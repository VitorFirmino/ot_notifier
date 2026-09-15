import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Pool } from "pg";
import { saveSiteCredential, getSiteCredential, deleteSiteCredential } from "../siteCredentials";

describe("siteCredentials", () => {
  let verifyPool: Pool;
  const domain = "ntoultimate-test.com.br";

  beforeAll(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY ??= "de6WyZTggOkkx6XCpuPxen1ypLjkH2zDq5epou8uqoU=";
    verifyPool = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  afterEach(async () => {
    await deleteSiteCredential(domain);
  });

  afterAll(async () => {
    await verifyPool.end();
  });

  it("saves a credential with the password encrypted at rest", async () => {
    await saveSiteCredential({
      domain,
      loginUrl: `https://${domain}/sub.php?page=login`,
      username: "deweda8045@duidir.com",
      password: "deweda@123",
    });

    const row = await verifyPool.query('SELECT "encryptedPassword" FROM "site_credentials" WHERE "domain" = $1', [
      domain,
    ]);
    expect(row.rows[0].encryptedPassword).not.toContain("deweda@123");
  });

  it("reads back the credential with the password decrypted", async () => {
    await saveSiteCredential({
      domain,
      loginUrl: `https://${domain}/sub.php?page=login`,
      username: "deweda8045@duidir.com",
      password: "deweda@123",
    });

    const credential = await getSiteCredential(domain);
    expect(credential).toEqual({
      domain,
      loginUrl: `https://${domain}/sub.php?page=login`,
      username: "deweda8045@duidir.com",
      password: "deweda@123",
    });
  });

  it("returns null for a domain with no stored credential", async () => {
    expect(await getSiteCredential("no-credential-for-this.example.com")).toBeNull();
  });

  it("upserts on the same domain instead of duplicating", async () => {
    await saveSiteCredential({
      domain,
      loginUrl: `https://${domain}/sub.php?page=login`,
      username: "first-user",
      password: "first-pass",
    });
    await saveSiteCredential({
      domain,
      loginUrl: `https://${domain}/sub.php?page=login`,
      username: "second-user",
      password: "second-pass",
    });

    const rows = await verifyPool.query('SELECT * FROM "site_credentials" WHERE "domain" = $1', [domain]);
    expect(rows.rows).toHaveLength(1);
    expect((await getSiteCredential(domain))?.username).toBe("second-user");
  });
});
