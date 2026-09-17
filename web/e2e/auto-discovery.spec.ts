import { test, expect } from "./helpers/fixtures";
import { uniqueTestEmail, deleteTestUser } from "./helpers/db";
import { signUpVerifyAndLogin, loginAsExistingUser, TEST_PASSWORD } from "./helpers/auth";

test.describe("Auto-discovery tab", () => {
  const email = uniqueTestEmail("e2e-discovery");
  let serverId: string | undefined;

  test.afterAll(async ({ pool }) => {
    if (serverId) {
      const { deleteServerConfig } = await import("../../src/infrastructure/storage/serverConfigManager");
      await deleteServerConfig(serverId).catch(() => {});
    }
    await deleteTestUser(pool, email);
  });

  test("no guilds found on the target site surfaces the empty-state message", async ({ page, pool }) => {
    await signUpVerifyAndLogin(page, pool, email, "E2E Discovery Test");

    await page.getByRole("button", { name: "Novo Servidor" }).click();
    await page.getByLabel("URL do servidor").fill("example.com");
    await page.getByRole("button", { name: "Buscar guildas" }).click();
    await expect(
      page.getByText("Nenhuma guilda encontrada nesta URL. Verifique se o endereço está correto.")
    ).toBeVisible();
  });

  test("selecting a discovered guild pre-fills and saves it through the normal add flow", async ({ page }) => {
    await page.goto("/app/login");
    await loginAsExistingUser(page, email, TEST_PASSWORD);

    await page.route("**/api/discover", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            guilds: [
              {
                name: "Discovered Guild",
                url: "https://example.com/?subtopic=guilds&action=view&GuildName=Discovered+Guild",
              },
            ],
          },
        }),
      });
    });

    await page.getByRole("button", { name: "Novo Servidor" }).click();
    await page.getByLabel("URL do servidor").fill("example.com");
    await page.getByRole("button", { name: "Buscar guildas" }).click();
    await page.getByText("Discovered Guild").click();

    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("heading", { name: "Discovered Guild" })).toBeVisible();

    const servers = ((await (await page.request.get("/api/servers")).json()).data) as Array<{
      serverId: string;
      serverName: string;
      guild: { url: string };
    }>;
    const discovered = servers.find((server) => server.serverName === "Discovered Guild");
    expect(discovered?.guild.url).toBe("https://example.com/?subtopic=guilds&action=view&GuildName=Discovered+Guild");
    serverId = discovered?.serverId;
  });
});
