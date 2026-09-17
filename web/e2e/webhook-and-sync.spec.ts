import { test, expect } from "./helpers/fixtures";
import { uniqueTestEmail, deleteTestUser } from "./helpers/db";
import { signUpVerifyAndLogin, addServerManually } from "./helpers/auth";

test.describe("Testing webhook and syncing a server from the dashboard", () => {
  const email = uniqueTestEmail("e2e-webhook");
  let serverId: string | undefined;

  test.afterAll(async ({ pool }) => {
    if (serverId) {
      const { deleteServerConfig } = await import("../../src/infrastructure/storage/serverConfigManager");
      await deleteServerConfig(serverId).catch(() => {});
    }
    await deleteTestUser(pool, email);
  });

  test("webhook test surfaces the backend error, sync now surfaces success", async ({ page, pool }) => {
    await signUpVerifyAndLogin(page, pool, email, "E2E Webhook Test");

    await addServerManually(page, {
      url: "https://example.com/?subtopic=guilds&action=view&GuildName=Webhook+Sync+Test",
      name: "Webhook Sync Test Guild",
    });
    await expect(page.getByRole("heading", { name: "Webhook Sync Test Guild" })).toBeVisible();

    const servers = ((await (await page.request.get("/api/servers")).json()).data) as Array<{
      serverId: string;
      serverName: string;
    }>;
    serverId = servers.find((server) => server.serverName === "Webhook Sync Test Guild")?.serverId;
    expect(serverId).toBeDefined();

    const webhookResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/test-webhook") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Testar webhook do Discord", exact: true }).click();
    const webhookResponse = await webhookResponsePromise;
    expect(webhookResponse.status()).toBe(400);
    await expect(
      page.getByText("Nenhum webhook Discord configurado para este servidor.")
    ).toBeVisible();

    const syncResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/sync") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Testar", exact: true }).click();
    const syncResponse = await syncResponsePromise;
    expect(syncResponse.status()).toBe(200);
    await expect(page.getByText(/Scraping concluído em Webhook Sync Test Guild/)).toBeVisible();
  });
});
