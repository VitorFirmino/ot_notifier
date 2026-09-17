import { test, expect } from "./helpers/fixtures";
import { uniqueTestEmail, deleteTestUser } from "./helpers/db";
import { signUpVerifyAndLogin, addServerManually } from "./helpers/auth";

test.describe("Dashboard behavior when the API becomes unreachable", () => {
  const email = uniqueTestEmail("e2e-offline");
  let serverId: string | undefined;

  test.afterAll(async ({ pool }) => {
    if (serverId) {
      const { deleteServerConfig } = await import("../../src/infrastructure/storage/serverConfigManager");
      await deleteServerConfig(serverId).catch(() => {});
    }
    await deleteTestUser(pool, email);
  });

  test("a failed servers refetch shows the offline banner instead of crashing", async ({ page, pool }) => {
    await signUpVerifyAndLogin(page, pool, email, "E2E Offline Test");

    await addServerManually(page, {
      url: "https://example.com/?subtopic=guilds&action=view&GuildName=Offline+Test",
      name: "Offline Test Guild",
    });
    await expect(page.getByRole("heading", { name: "Offline Test Guild" })).toBeVisible();

    const servers = ((await (await page.request.get("/api/servers")).json()).data) as Array<{
      serverId: string;
      serverName: string;
    }>;
    serverId = servers.find((server) => server.serverName === "Offline Test Guild")?.serverId;
    expect(serverId).toBeDefined();

    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/servers" && route.request().method() === "GET") {
        await route.abort("failed");
        return;
      }
      await route.continue();
    });

    await page.getByRole("button", { name: "Verificar Todos" }).click();

    await expect(
      page.getByText("Não foi possível conectar à API. Os dados exibidos podem estar desatualizados.")
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Offline Test Guild" })).toBeVisible();

    await page.unroute("**/*");
  });
});
