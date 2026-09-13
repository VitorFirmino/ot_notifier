import { test, expect, type Page } from "@playwright/test";
import { createPool, uniqueTestEmail, markEmailVerified, deleteTestUser } from "./helpers/db";

const pool = createPool();
const password = "Str0ng!Pass2026";

const signUpVerifyAndLogin = async (page: Page, email: string, name: string) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Não tem conta? Criar uma" }).click();
  await page.getByLabel("Nome:").fill(name);
  await page.getByLabel("Email:").fill(email);
  await page.getByLabel("Senha:", { exact: true }).fill(password);
  await page.getByLabel("Repetir senha:").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("heading", { name: "Confirme seu email" })).toBeVisible();

  await markEmailVerified(pool, email);

  await page.getByRole("button", { name: "Voltar para o login" }).click();
  await page.getByLabel("Email:").fill(email);
  await page.getByLabel("Senha:", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dashboard Principal" })).toBeVisible();
};

test.describe("A server added by one account is invisible to another", () => {
  const ownerEmail = uniqueTestEmail("e2e-owner");
  const intruderEmail = uniqueTestEmail("e2e-intruder");
  let ownedServerId: string | undefined;

  test.afterAll(async () => {
    if (ownedServerId) {
      const { deleteServerConfig } = await import(
        "../../src/infrastructure/storage/serverConfigManager"
      );
      await deleteServerConfig(ownedServerId).catch(() => {});
    }
    await deleteTestUser(pool, ownerEmail);
    await deleteTestUser(pool, intruderEmail);
    await pool.end();
  });

  test("the intruder's dashboard never shows the owner's server", async ({ browser }) => {
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await signUpVerifyAndLogin(ownerPage, ownerEmail, "E2E Owner");

    await ownerPage.getByRole("button", { name: "Novo Servidor" }).click();
    await ownerPage.getByRole("tab", { name: "Cadastro manual" }).click();
    await ownerPage.getByLabel("Nome do servidor / guilda *").fill("Owner Only Guild");
    await ownerPage
      .getByLabel("URL da guilda (alvo do scraping) *")
      .fill("https://example.com/?subtopic=guilds&action=view&GuildName=Owner+Only");
    await ownerPage.getByRole("button", { name: "Salvar" }).click();
    await expect(ownerPage.getByRole("dialog")).toBeHidden();
    await expect(ownerPage.getByRole("heading", { name: "Owner Only Guild" })).toBeVisible();

    const ownServers = (await (await ownerPage.request.get("/api/servers")).json()) as Array<{
      serverId: string;
      serverName: string;
    }>;
    ownedServerId = ownServers.find((server) => server.serverName === "Owner Only Guild")?.serverId;
    expect(ownedServerId).toBeDefined();

    const intruderContext = await browser.newContext();
    const intruderPage = await intruderContext.newPage();
    await signUpVerifyAndLogin(intruderPage, intruderEmail, "E2E Intruder");

    await expect(intruderPage.getByRole("heading", { name: "Owner Only Guild" })).not.toBeVisible();
    await expect(intruderPage.getByText("Servidores Open Tibia Monitored (0)")).toBeVisible();

    const intruderServers = (await (await intruderPage.request.get("/api/servers")).json()) as unknown[];
    expect(intruderServers).toHaveLength(0);

    await ownerContext.close();
    await intruderContext.close();
  });
});
