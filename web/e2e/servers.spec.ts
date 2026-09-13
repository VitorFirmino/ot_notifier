import { test, expect } from "@playwright/test";
import { createPool, uniqueTestEmail, markEmailVerified, deleteTestUser } from "./helpers/db";

const pool = createPool();

const loginAsVerifiedUser = async (
  page: import("@playwright/test").Page,
  email: string,
  password: string
) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Não tem conta? Criar uma" }).click();
  await page.getByLabel("Nome:").fill("E2E Servers Test");
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

const addServerManually = async (
  page: import("@playwright/test").Page,
  { url, name }: { url: string; name: string }
) => {
  await page.getByRole("button", { name: "Novo Servidor" }).click();
  await page.getByRole("tab", { name: "Cadastro manual" }).click();
  await page.getByLabel("Nome do servidor / guilda *").fill(name);
  await page.getByLabel("URL da guilda (alvo do scraping) *").fill(url);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
};

test.describe("Adding two guilds on the same OT server", () => {
  const email = uniqueTestEmail("e2e-servers");
  const password = "Str0ng!Pass2026";
  const createdServerIds: string[] = [];

  test.afterAll(async ({ browser }) => {
    if (createdServerIds.length > 0) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto("/login");
      await page.getByLabel("Email:").fill(email);
      await page.getByLabel("Senha:", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Dashboard Principal" })).toBeVisible();

      for (const serverId of createdServerIds) {
        await page.request.delete(`/api/servers/${serverId}`).catch(() => {});
      }
      await context.close();
    }
    await deleteTestUser(pool, email);
    await pool.end();
  });

  test("both guilds appear as separate cards instead of the second overwriting the first", async ({
    page,
  }) => {
    await loginAsVerifiedUser(page, email, password);

    const guildAUrl = "https://example.com/?subtopic=guilds&action=view&GuildName=E2E+Guild+A";
    const guildBUrl = "https://example.com/?subtopic=guilds&action=view&GuildName=E2E+Guild+B";

    await addServerManually(page, { url: guildAUrl, name: "E2E Guild A" });
    await expect(page.getByRole("heading", { name: "E2E Guild A", exact: true })).toBeVisible();

    await addServerManually(page, { url: guildBUrl, name: "E2E Guild B" });

    await expect(page.getByRole("heading", { name: "E2E Guild A", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "E2E Guild B", exact: true })).toBeVisible();

    const statsResponse = await page.request.get("/api/servers");
    const servers = (await statsResponse.json()) as Array<{ serverId: string; serverName: string }>;
    const guildA = servers.find((server) => server.serverName === "E2E Guild A");
    const guildB = servers.find((server) => server.serverName === "E2E Guild B");
    expect(guildA).toBeDefined();
    expect(guildB).toBeDefined();
    expect(guildA?.serverId).not.toBe(guildB?.serverId);

    if (guildA) createdServerIds.push(guildA.serverId);
    if (guildB) createdServerIds.push(guildB.serverId);
  });
});
