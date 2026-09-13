import { test, expect } from "@playwright/test";
import { createPool, uniqueTestEmail, deleteTestUser } from "./helpers/db";
import { signUpVerifyAndLogin, addServerManually } from "./helpers/auth";

const pool = createPool();

test.describe("Searching for a character", () => {
  const email = uniqueTestEmail("e2e-charsearch");
  let serverId: string | undefined;

  test.afterAll(async () => {
    if (serverId) {
      const { deleteServerConfig } = await import("../../src/infrastructure/storage/serverConfigManager");
      await deleteServerConfig(serverId).catch(() => {});
    }
    await deleteTestUser(pool, email);
    await pool.end();
  });

  test("typing a name filters to the matching character across all servers", async ({ page }) => {
    await signUpVerifyAndLogin(page, pool, email, "E2E Character Search Test");

    await addServerManually(page, {
      url: "https://example.com/?subtopic=guilds&action=view&GuildName=Character+Search+Guild",
      name: "Character Search Guild",
    });
    await expect(page.getByRole("heading", { name: "Character Search Guild" })).toBeVisible();

    const servers = (await (await page.request.get("/api/servers")).json()) as Array<{
      serverId: string;
      serverName: string;
    }>;
    serverId = servers.find((server) => server.serverName === "Character Search Guild")?.serverId;
    expect(serverId).toBeDefined();

    const { updateServerCharacters } = await import("../../src/infrastructure/storage/serverConfigManager");
    await updateServerCharacters(serverId!, {
      "Search Target": {
        url: "https://example.com/character/Search+Target",
        last_level: 300,
        isOnline: true,
      },
      "Other Character": {
        url: "https://example.com/character/Other+Character",
        last_level: 50,
        isOnline: false,
      },
    });

    await page.getByRole("button", { name: "Verificar Todos" }).click();

    const searchInput = page.getByPlaceholder("Buscar personagem nos servidores ativos...");
    await searchInput.fill("search target");

    await expect(page.getByText("Search Target", { exact: true })).toBeVisible();
    await expect(page.getByText(/Nível:\s*300/)).toBeVisible();
    await expect(page.getByText("Online", { exact: true })).toBeVisible();
    await expect(page.getByText("Other Character", { exact: true })).not.toBeVisible();
  });
});
