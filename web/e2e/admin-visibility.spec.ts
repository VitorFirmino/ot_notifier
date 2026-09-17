import { test, expect } from "./helpers/fixtures";
import { deleteTestUser, markEmailVerified, uniqueTestEmail } from "./helpers/db";
import { TEST_PASSWORD, signUpVerifyAndLogin, loginAsExistingUser } from "./helpers/auth";

const adminEmail = "e2e-admin@example.com";

test.describe("Admin sees every user's servers", () => {
  const ownerEmail = uniqueTestEmail("e2e-admin-owner");
  let serverId: string | undefined;

  test.afterAll(async ({ pool }) => {
    if (serverId) {
      const { deleteServerConfig } = await import("../../src/infrastructure/storage/serverConfigManager");
      await deleteServerConfig(serverId).catch(() => {});
    }
    await deleteTestUser(pool, ownerEmail);
    await deleteTestUser(pool, adminEmail);
  });

  test("the admin dashboard lists a server created by a regular user", async ({ browser, pool }) => {
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await signUpVerifyAndLogin(ownerPage, pool, ownerEmail, "E2E Admin Owner");

    await ownerPage.getByRole("button", { name: "Novo Servidor" }).click();
    await ownerPage.getByRole("tab", { name: "Cadastro manual" }).click();
    await ownerPage.getByLabel("Nome do servidor / guilda *").fill("Regular User Guild");
    await ownerPage
      .getByLabel("URL da guilda (alvo do scraping) *")
      .fill("https://example.com/?subtopic=guilds&action=view&GuildName=Regular+User");
    await ownerPage.getByRole("button", { name: "Salvar" }).click();
    await expect(ownerPage.getByRole("dialog")).toBeHidden();
    await expect(ownerPage.getByRole("heading", { name: "Regular User Guild" })).toBeVisible();

    const ownerServers = ((await (await ownerPage.request.get("/api/servers")).json()).data) as Array<{
      serverId: string;
      serverName: string;
    }>;
    serverId = ownerServers.find((server) => server.serverName === "Regular User Guild")?.serverId;
    expect(serverId).toBeDefined();
    await ownerContext.close();

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await adminPage.goto("/app/login");
    await adminPage.getByRole("button", { name: "Não tem conta? Criar uma" }).click();
    await adminPage.getByLabel("Nome:").fill("E2E Admin");
    await adminPage.getByLabel("Email:").fill(adminEmail);
    await adminPage.getByLabel("Senha:", { exact: true }).fill(TEST_PASSWORD);
    await adminPage.getByLabel("Repetir senha:").fill(TEST_PASSWORD);
    await adminPage.getByRole("button", { name: "Criar conta" }).click();
    await expect(adminPage.getByRole("heading", { name: "Confirme seu email" })).toBeVisible();
    await markEmailVerified(pool, adminEmail);
    await adminPage.getByRole("button", { name: "Voltar para o login" }).click();
    await loginAsExistingUser(adminPage, adminEmail, TEST_PASSWORD);

    await expect(adminPage.getByRole("heading", { name: "Regular User Guild" })).toBeVisible();

    const adminServers = ((await (await adminPage.request.get("/api/servers")).json()).data) as Array<{
      serverName: string;
    }>;
    expect(adminServers.some((server) => server.serverName === "Regular User Guild")).toBe(true);

    await adminContext.close();
  });
});
