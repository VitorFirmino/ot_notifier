import { test, expect } from "./helpers/fixtures";
import { uniqueTestEmail, deleteTestUser } from "./helpers/db";
import { signUpVerifyAndLogin } from "./helpers/auth";

test.describe("Adding a server on a site that requires login", () => {
  const email = uniqueTestEmail("e2e-sitelogin");
  let serverId: string | undefined;

  test.afterAll(async ({ pool }) => {
    if (serverId) {
      const { deleteServerConfig } = await import("../../src/infrastructure/storage/serverConfigManager");
      await deleteServerConfig(serverId).catch(() => {});
    }
    await deleteTestUser(pool, email);
  });

  test("prompts for login inline, then completes the save after a successful login", async ({
    page,
    pool,
  }) => {
    await signUpVerifyAndLogin(page, pool, email, "E2E Site Login Test");

    let addServerCallCount = 0;
    await page.route("**/api/servers", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        await route.continue();
        return;
      }

      addServerCallCount += 1;
      if (addServerCallCount === 1) {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Login necessário para acessar example.com.",
            code: "LOGIN_REQUIRED",
            domain: "example.com",
            loginUrl: "https://example.com/sub.php?page=login",
          }),
        });
        return;
      }

      await route.continue();
    });

    let loginCallCount = 0;
    await page.route("**/api/site-auth/login", async (route) => {
      loginCallCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { domain: "example.com" } }),
      });
    });

    await page.getByRole("button", { name: "Novo Servidor" }).click();
    await page.getByRole("tab", { name: "Cadastro manual" }).click();
    await page.getByLabel("Nome do servidor / guilda *").fill("Needs Login Guild");
    await page
      .getByLabel("URL da guilda (alvo do scraping) *")
      .fill("https://example.com/?subtopic=guilds&action=view&GuildName=Needs+Login");
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByRole("dialog").getByText("example.com", { exact: false })).toBeVisible();
    await expect(page.getByLabel("Usuário / email")).toBeVisible();
    await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();

    await page.getByLabel("Usuário / email").fill("deweda8045@duidir.com");
    await page.getByLabel("Senha", { exact: true }).fill("deweda@123");

    const addServerRetryPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/servers") &&
        response.request().method() === "POST" &&
        response.status() !== 401
    );
    await page.getByRole("button", { name: "Entrar e continuar" }).click();
    await addServerRetryPromise;

    expect(loginCallCount).toBe(1);
    expect(addServerCallCount).toBe(2);

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("heading", { name: "Needs Login Guild" })).toBeVisible();

    const servers = ((await (await page.request.get("/api/servers")).json()).data) as Array<{
      serverId: string;
      serverName: string;
    }>;
    serverId = servers.find((server) => server.serverName === "Needs Login Guild")?.serverId;
    expect(serverId).toBeDefined();
  });
});

test.describe("Auto-discovery on a site that requires login", () => {
  const email = uniqueTestEmail("e2e-discoverylogin");

  test.afterAll(async ({ pool }) => {
    await deleteTestUser(pool, email);
  });

  test("prompts for login during discovery, then shows guilds after a successful login", async ({ page, pool }) => {
    await signUpVerifyAndLogin(page, pool, email, "E2E Discovery Login Test");

    let discoverCallCount = 0;
    await page.route("**/api/discover", async (route) => {
      discoverCallCount += 1;
      if (discoverCallCount === 1) {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Login necessário para acessar example.com.",
            code: "LOGIN_REQUIRED",
            domain: "example.com",
            loginUrl: "https://example.com/sub.php?page=login",
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            guilds: [
              {
                name: "Discovered After Login",
                url: "https://example.com/?subtopic=guilds&action=view&GuildName=Discovered+After+Login",
              },
            ],
            htmlLength: 123,
          },
        }),
      });
    });

    let loginCallCount = 0;
    await page.route("**/api/site-auth/login", async (route) => {
      loginCallCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { domain: "example.com" } }),
      });
    });

    await page.getByRole("button", { name: "Novo Servidor" }).click();
    await page.getByLabel("URL do servidor").fill("example.com");
    await page.getByRole("button", { name: "Buscar guildas" }).click();

    await expect(page.getByRole("dialog").getByText("example.com", { exact: false })).toBeVisible();
    await expect(page.getByLabel("Usuário / email")).toBeVisible();
    await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();

    await page.getByLabel("Usuário / email").fill("deweda8045@duidir.com");
    await page.getByLabel("Senha", { exact: true }).fill("deweda@123");
    await page.getByRole("button", { name: "Entrar e continuar" }).click();

    await expect(page.getByText("Discovered After Login")).toBeVisible();

    expect(loginCallCount).toBe(1);
    expect(discoverCallCount).toBe(2);
  });
});
