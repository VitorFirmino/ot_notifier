import { test, expect } from "./helpers/fixtures";
import { uniqueTestEmail, deleteTestUser } from "./helpers/db";
import { TEST_PASSWORD, signUpVerifyAndLogin, loginAsExistingUser, addServerManually } from "./helpers/auth";

test.describe("Adding two guilds on the same OT server", () => {
  const email = uniqueTestEmail("e2e-servers");
  const createdServerIds: string[] = [];

  test.afterAll(async ({ browser, pool }) => {
    if (createdServerIds.length > 0) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto("/login");
      await loginAsExistingUser(page, email, TEST_PASSWORD);

      for (const serverId of createdServerIds) {
        await page.request.delete(`/api/servers/${serverId}`).catch(() => {});
      }
      await context.close();
    }
    await deleteTestUser(pool, email);
  });

  test("both guilds appear as separate cards instead of the second overwriting the first", async ({
    page,
    pool,
  }) => {
    await signUpVerifyAndLogin(page, pool, email, "E2E Servers Test");

    const guildAUrl = "https://example.com/?subtopic=guilds&action=view&GuildName=E2E+Guild+A";
    const guildBUrl = "https://example.com/?subtopic=guilds&action=view&GuildName=E2E+Guild+B";

    await addServerManually(page, { url: guildAUrl, name: "E2E Guild A" });
    await expect(page.getByRole("heading", { name: "E2E Guild A", exact: true })).toBeVisible();

    await addServerManually(page, { url: guildBUrl, name: "E2E Guild B" });

    await expect(page.getByRole("heading", { name: "E2E Guild A", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "E2E Guild B", exact: true })).toBeVisible();

    const statsResponse = await page.request.get("/api/servers");
    const servers = (await statsResponse.json()) as Array<{ serverId: string; serverName: string }>;
    const guildA = servers.find((server) => server.serverName === "E2E Guild A");
    const guildB = servers.find((server) => server.serverName === "E2E Guild B");
    expect(guildA).toBeDefined();
    expect(guildB).toBeDefined();
    expect(guildA?.serverId).not.toBe(guildB?.serverId);

    if (guildA) createdServerIds.push(guildA.serverId);
    if (guildB) createdServerIds.push(guildB.serverId);
  });
});
