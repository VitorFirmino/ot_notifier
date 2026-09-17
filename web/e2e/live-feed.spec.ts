import { test, expect } from "./helpers/fixtures";
import { uniqueTestEmail, deleteTestUser } from "./helpers/db";
import { signUpVerifyAndLogin, addServerManually } from "./helpers/auth";

test.describe("Live feed after a manual sync", () => {
  const email = uniqueTestEmail("e2e-livefeed");
  let serverId: string | undefined;

  test.afterAll(async ({ pool }) => {
    if (serverId) {
      const { deleteServerConfig } = await import("../../src/infrastructure/storage/serverConfigManager");
      await deleteServerConfig(serverId).catch(() => {});
    }
    await deleteTestUser(pool, email);
  });

  test("a sync event shows up in the activity feed", async ({ page, pool }) => {
    await signUpVerifyAndLogin(page, pool, email, "E2E Live Feed Test");

    await addServerManually(page, {
      url: "https://example.com/?subtopic=guilds&action=view&GuildName=Live+Feed+Test",
      name: "Live Feed Test Guild",
    });
    await expect(page.getByRole("heading", { name: "Live Feed Test Guild" })).toBeVisible();

    const servers = ((await (await page.request.get("/api/servers")).json()).data) as Array<{
      serverId: string;
      serverName: string;
    }>;
    serverId = servers.find((server) => server.serverName === "Live Feed Test Guild")?.serverId;
    expect(serverId).toBeDefined();

    const syncResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/sync") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Testar", exact: true }).click();
    await syncResponsePromise;

    await expect(page.getByText("guild sync", { exact: true })).toBeVisible();
    await expect(page.getByText(/Varredura manual executada/)).toBeVisible();
  });
});
