import { test, expect } from "./helpers/fixtures";
import { uniqueTestEmail, deleteTestUser } from "./helpers/db";
import { signUpVerifyAndLogin, addServerManually } from "./helpers/auth";

test.describe("Inspecting a character live", () => {
  const email = uniqueTestEmail("e2e-inspect");
  let serverId: string | undefined;

  test.afterAll(async ({ pool }) => {
    if (serverId) {
      const { deleteServerConfig } = await import("../../src/infrastructure/storage/serverConfigManager");
      await deleteServerConfig(serverId).catch(() => {});
    }
    await deleteTestUser(pool, email);
  });

  test("shows live details on success and a clear error message on failure", async ({ page, pool }) => {
    await signUpVerifyAndLogin(page, pool, email, "E2E Inspect Test");

    await addServerManually(page, {
      url: "https://example.com/?subtopic=guilds&action=view&GuildName=Inspect+Test",
      name: "Inspect Test Guild",
    });
    await expect(page.getByRole("heading", { name: "Inspect Test Guild" })).toBeVisible();

    const servers = (await (await page.request.get("/api/servers")).json()) as Array<{
      serverId: string;
      serverName: string;
    }>;
    serverId = servers.find((server) => server.serverName === "Inspect Test Guild")?.serverId;
    expect(serverId).toBeDefined();

    const { updateServerCharacters } = await import("../../src/infrastructure/storage/serverConfigManager");
    await updateServerCharacters(serverId!, {
      "Inspectable Knight": {
        url: "https://example.com/character/Inspectable+Knight",
        last_level: 150,
        isOnline: true,
      },
      "Uninspectable Rogue": {
        url: "https://example.com/character/Uninspectable+Rogue",
        last_level: 75,
        isOnline: false,
      },
    });

    await page.getByRole("button", { name: "Verificar Todos" }).click();
    const searchInput = page.getByPlaceholder("Buscar personagem nos servidores ativos...");

    await page.route("**/api/character/inspect", async (route) => {
      const body = route.request().postDataJSON() as { name: string };
      if (body.name === "Uninspectable Rogue") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Erro ao inspecionar personagem: falha de conexão simulada" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          exists: true,
          name: "Inspectable Knight",
          level: 150,
          isOnline: true,
          vocation: "Elite Knight",
          residence: "Thais",
          deaths: [],
        }),
      });
    });

    await searchInput.fill("Inspectable Knight");
    await page.getByText("Inspectable Knight", { exact: true }).click();
    await expect(page.getByRole("dialog").getByText("Elite Knight")).toBeVisible();
    await expect(page.getByRole("dialog").getByText("Thais")).toBeVisible();
    await expect(
      page.getByText("Nenhuma morte recente registrada no perfil oficial.")
    ).toBeVisible();
    await page.getByRole("button", { name: "Fechar" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await searchInput.fill("Uninspectable Rogue");
    await page.getByText("Uninspectable Rogue", { exact: true }).click();
    await expect(page.getByText("Falha ao inspecionar personagem")).toBeVisible();
    await expect(page.getByText("Erro ao inspecionar personagem: falha de conexão simulada")).toBeVisible();
  });
});
