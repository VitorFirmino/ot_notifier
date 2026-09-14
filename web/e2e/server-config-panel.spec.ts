import { test, expect } from "@playwright/test";
import { createPool, uniqueTestEmail, deleteTestUser } from "./helpers/db";
import { signUpVerifyAndLogin } from "./helpers/auth";

test.describe("Managing a server from the \"Servidores & Saúde\" tab", () => {
  const pool = createPool();
  const email = uniqueTestEmail("e2e-configpanel");
  let serverId: string | undefined;

  test.afterAll(async () => {
    if (serverId) {
      const { deleteServerConfig } = await import("../../src/infrastructure/storage/serverConfigManager");
      await deleteServerConfig(serverId).catch(() => {});
    }
    await deleteTestUser(pool, email);
    await pool.end();
  });

  test("adding, pausing, reactivating and deleting all work from this alternate view", async ({ page }) => {
    await signUpVerifyAndLogin(page, pool, email, "E2E Config Panel Test");

    await page.getByRole("button", { name: "Servidores & Saúde" }).click();
    await expect(page.getByRole("heading", { name: "Gerenciador & Monitor de Saúde dos Servidores" })).toBeVisible();

    await page.getByRole("button", { name: "Cadastrar Novo Servidor" }).click();
    await page.getByRole("tab", { name: "Cadastro manual" }).click();
    await page.getByLabel("Nome do servidor / guilda *").fill("Config Panel Guild");
    await page
      .getByLabel("URL da guilda (alvo do scraping) *")
      .fill("https://example.com/?subtopic=guilds&action=view&GuildName=Config+Panel");

    const addResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/servers") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Salvar" }).click();
    await addResponsePromise;
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("heading", { name: "Config Panel Guild" })).toBeVisible();
    await expect(page.getByText("Ativo", { exact: true })).toBeVisible();

    const servers = (await (await page.request.get("/api/servers")).json()) as Array<{
      serverId: string;
      serverName: string;
    }>;
    serverId = servers.find((server) => server.serverName === "Config Panel Guild")?.serverId;
    expect(serverId).toBeDefined();

    await page.getByRole("button", { name: "Pausar servidor" }).click();
    await expect(page.getByText("Pausado", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Ativar servidor" }).click();
    await expect(page.getByText("Ativo", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Excluir servidor" }).click();
    await expect(page.getByRole("heading", { name: "Remover servidor" })).toBeVisible();
    await page.getByRole("button", { name: "Remover", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Config Panel Guild" })).not.toBeVisible();

    const serversAfterDelete = (await (await page.request.get("/api/servers")).json()) as unknown[];
    expect(serversAfterDelete).toHaveLength(0);
    serverId = undefined;
  });
});
