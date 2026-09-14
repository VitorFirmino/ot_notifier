import { test, expect } from "./helpers/fixtures";
import { uniqueTestEmail, deleteTestUser } from "./helpers/db";
import { signUpVerifyAndLogin, addServerManually } from "./helpers/auth";

test.describe("Deleting a server", () => {
  const email = uniqueTestEmail("e2e-delete");
  let serverId: string | undefined;

  test.afterAll(async ({ pool }) => {
    if (serverId) {
      const { deleteServerConfig } = await import("../../src/infrastructure/storage/serverConfigManager");
      await deleteServerConfig(serverId).catch(() => {});
    }
    await deleteTestUser(pool, email);
  });

  test("cancelling keeps the server, confirming removes it everywhere", async ({ page, pool }) => {
    await signUpVerifyAndLogin(page, pool, email, "E2E Delete Test");

    await addServerManually(page, {
      url: "https://example.com/?subtopic=guilds&action=view&GuildName=Delete+Me",
      name: "Delete Me Guild",
    });
    await expect(page.getByRole("heading", { name: "Delete Me Guild" })).toBeVisible();

    const servers = (await (await page.request.get("/api/servers")).json()) as Array<{
      serverId: string;
      serverName: string;
    }>;
    serverId = servers.find((server) => server.serverName === "Delete Me Guild")?.serverId;
    expect(serverId).toBeDefined();

    await page.getByRole("button", { name: "Remover servidor", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Remover servidor" })).toBeVisible();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("heading", { name: "Remover servidor" })).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Delete Me Guild" })).toBeVisible();

    const serversAfterCancel = (await (await page.request.get("/api/servers")).json()) as unknown[];
    expect(serversAfterCancel).toHaveLength(1);

    await page.getByRole("button", { name: "Remover servidor", exact: true }).click();
    await page.getByRole("button", { name: "Remover", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Delete Me Guild" })).not.toBeVisible();

    const serversAfterDelete = (await (await page.request.get("/api/servers")).json()) as unknown[];
    expect(serversAfterDelete).toHaveLength(0);

    serverId = undefined;
  });
});
