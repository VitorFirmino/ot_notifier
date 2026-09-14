import { test, expect } from "./helpers/fixtures";
import { uniqueTestEmail, deleteTestUser } from "./helpers/db";
import { signUpVerifyAndLogin, addServerManually } from "./helpers/auth";

test.describe("Adding a server: client-side validation errors", () => {
  const email = uniqueTestEmail("e2e-servererr");

  test.afterAll(async ({ pool }) => {
    await deleteTestUser(pool, email);
  });

  test("an invalid URL and a blank name are rejected before any request is sent", async ({ page, pool }) => {
    await signUpVerifyAndLogin(page, pool, email, "E2E Server Errors");

    let addRequestCount = 0;
    page.on("request", (request) => {
      if (request.url().includes("/api/servers") && request.method() === "POST") addRequestCount += 1;
    });

    await page.getByRole("button", { name: "Novo Servidor" }).click();
    await page.getByRole("tab", { name: "Cadastro manual" }).click();
    await page.getByLabel("Nome do servidor / guilda *").fill("Invalid URL Guild");
    await page.getByLabel("URL da guilda (alvo do scraping) *").fill("not-a-valid-url");
    await page.getByRole("button", { name: "Salvar" }).click();
    await page.waitForTimeout(500);
    expect(addRequestCount).toBe(0);
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel("Nome do servidor / guilda *").fill("");
    await page.getByLabel("URL da guilda (alvo do scraping) *").fill("https://example.com/guilds");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Informe o nome do servidor.")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(addRequestCount).toBe(0);
  });
});

test.describe("A second account cannot claim a guild another account already owns", () => {
  const ownerEmail = uniqueTestEmail("e2e-claimowner");
  const intruderEmail = uniqueTestEmail("e2e-claimintruder");
  let serverId: string | undefined;

  test.afterAll(async ({ pool }) => {
    if (serverId) {
      const { deleteServerConfig } = await import("../../src/infrastructure/storage/serverConfigManager");
      await deleteServerConfig(serverId).catch(() => {});
    }
    await deleteTestUser(pool, ownerEmail);
    await deleteTestUser(pool, intruderEmail);
  });

  test("adding the exact same guild URL as an existing server fails with a permission error", async ({
    browser,
    pool,
  }) => {
    const guildUrl = "https://example.com/?subtopic=guilds&action=view&GuildName=Claimed+Guild";

    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await signUpVerifyAndLogin(ownerPage, pool, ownerEmail, "E2E Claim Owner");
    await addServerManually(ownerPage, { url: guildUrl, name: "Claimed Guild" });
    await expect(ownerPage.getByRole("heading", { name: "Claimed Guild" })).toBeVisible();

    const ownerServers = (await (await ownerPage.request.get("/api/servers")).json()) as Array<{
      serverId: string;
      serverName: string;
    }>;
    serverId = ownerServers.find((server) => server.serverName === "Claimed Guild")?.serverId;
    expect(serverId).toBeDefined();
    await ownerContext.close();

    const intruderContext = await browser.newContext();
    const intruderPage = await intruderContext.newPage();
    await signUpVerifyAndLogin(intruderPage, pool, intruderEmail, "E2E Claim Intruder");

    await intruderPage.getByRole("button", { name: "Novo Servidor" }).click();
    await intruderPage.getByRole("tab", { name: "Cadastro manual" }).click();
    await intruderPage.getByLabel("Nome do servidor / guilda *").fill("Stolen Guild");
    await intruderPage.getByLabel("URL da guilda (alvo do scraping) *").fill(guildUrl);

    const addResponsePromise = intruderPage.waitForResponse(
      (response) => response.url().includes("/api/servers") && response.request().method() === "POST"
    );
    await intruderPage.getByRole("button", { name: "Salvar" }).click();
    const addResponse = await addResponsePromise;
    expect(addResponse.status()).toBe(403);
    await expect(
      intruderPage.getByText("Você não tem permissão para modificar este servidor.")
    ).toBeVisible();

    await expect(intruderPage.getByRole("heading", { name: "Stolen Guild" })).not.toBeVisible();
    const intruderServers = (await (await intruderPage.request.get("/api/servers")).json()) as unknown[];
    expect(intruderServers).toHaveLength(0);

    await intruderContext.close();
  });
});
