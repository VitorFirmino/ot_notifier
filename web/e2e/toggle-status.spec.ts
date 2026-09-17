import { test, expect } from "./helpers/fixtures";
import { uniqueTestEmail, deleteTestUser } from "./helpers/db";
import { signUpVerifyAndLogin, addServerManually } from "./helpers/auth";

test.describe("Pausing and reactivating a server", () => {
  const email = uniqueTestEmail("e2e-toggle");
  let serverId: string | undefined;

  test.afterAll(async ({ pool }) => {
    if (serverId) {
      const { deleteServerConfig } = await import("../../src/infrastructure/storage/serverConfigManager");
      await deleteServerConfig(serverId).catch(() => {});
    }
    await deleteTestUser(pool, email);
  });

  test("pausing shows the paused badge and disables the guild, reactivating restores it", async ({
    page,
    pool,
  }) => {
    await signUpVerifyAndLogin(page, pool, email, "E2E Toggle Test");

    await addServerManually(page, {
      url: "https://example.com/?subtopic=guilds&action=view&GuildName=Toggle+Me",
      name: "Toggle Me Guild",
    });
    await expect(page.getByRole("heading", { name: "Toggle Me Guild" })).toBeVisible();

    const servers = ((await (await page.request.get("/api/servers")).json()).data) as Array<{
      serverId: string;
      serverName: string;
      guild: { enabled: boolean };
    }>;
    const server = servers.find((entry) => entry.serverName === "Toggle Me Guild");
    serverId = server?.serverId;
    expect(server?.guild.enabled).not.toBe(false);

    await page.getByRole("button", { name: "Pausar", exact: true }).click();
    await expect(page.getByText("Toggle Me Guild foi pausado.")).toBeVisible();
    await expect(page.getByText("Pausado", { exact: true })).toBeVisible();

    const serversAfterPause = ((await (await page.request.get("/api/servers")).json()).data) as Array<{
      serverId: string;
      guild: { enabled: boolean };
    }>;
    expect(serversAfterPause.find((entry) => entry.serverId === serverId)?.guild.enabled).toBe(false);

    await page.getByRole("button", { name: "Ativar", exact: true }).click();
    await expect(page.getByText("Toggle Me Guild foi ativado.")).toBeVisible();
    await expect(page.getByText("Ativo", { exact: true })).toBeVisible();

    const serversAfterReactivate = ((await (await page.request.get("/api/servers")).json()).data) as Array<{
      serverId: string;
      guild: { enabled: boolean };
    }>;
    expect(serversAfterReactivate.find((entry) => entry.serverId === serverId)?.guild.enabled).toBe(true);
  });
});
