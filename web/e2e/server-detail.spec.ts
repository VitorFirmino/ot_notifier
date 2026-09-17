import { test, expect } from "./helpers/fixtures";
import { uniqueTestEmail, deleteTestUser } from "./helpers/db";
import { signUpVerifyAndLogin, addServerManually } from "./helpers/auth";

test.describe("Navigating into a server's detail page", () => {
  const email = uniqueTestEmail("e2e-detail");
  let serverId: string | undefined;

  test.afterAll(async ({ pool }) => {
    if (serverId) {
      const { deleteServerConfig } = await import("../../src/infrastructure/storage/serverConfigManager");
      await deleteServerConfig(serverId).catch(() => {});
    }
    await deleteTestUser(pool, email);
  });

  test("opens the right server and the back button returns to the list", async ({ page, pool }) => {
    await signUpVerifyAndLogin(page, pool, email, "E2E Detail Test");

    await addServerManually(page, {
      url: "https://example.com/?subtopic=guilds&action=view&GuildName=Server+Detail+Guild",
      name: "Server Detail Guild",
    });
    await expect(page.getByRole("heading", { name: "Server Detail Guild" })).toBeVisible();

    const servers = ((await (await page.request.get("/api/servers")).json()).data) as Array<{
      serverId: string;
      serverName: string;
    }>;
    serverId = servers.find((server) => server.serverName === "Server Detail Guild")?.serverId;
    expect(serverId).toBeDefined();

    await page.getByRole("heading", { name: "Server Detail Guild" }).click();
    await expect(page).toHaveURL(new RegExp(`/servers/${serverId}$`));
    await expect(page.getByRole("heading", { name: "Server Detail Guild", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "example.com" })).toBeVisible();

    await page.getByRole("button", { name: "Voltar para Servidores" }).click();
    await expect(page).toHaveURL(/\/servers$/);
    await expect(page.getByRole("heading", { name: "Server Detail Guild", level: 1 })).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Server Detail Guild" })).toBeVisible();
  });
});
