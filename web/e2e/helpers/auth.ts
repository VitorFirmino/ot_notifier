import { expect, type Page } from "@playwright/test";
import type { Pool } from "pg";
import { markEmailVerified } from "./db";

export const TEST_PASSWORD = "Str0ng!Pass2026";

export const signUpVerifyAndLogin = async (
  page: Page,
  pool: Pool,
  email: string,
  name: string,
  password: string = TEST_PASSWORD
): Promise<void> => {
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
  await loginAsExistingUser(page, email, password);
};

export const loginAsExistingUser = async (page: Page, email: string, password: string): Promise<void> => {
  await page.getByLabel("Email:").fill(email);
  await page.getByLabel("Senha:", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dashboard Principal" })).toBeVisible();
};

export const addServerManually = async (
  page: Page,
  { url, name }: { url: string; name: string }
): Promise<void> => {
  await page.getByRole("button", { name: "Novo Servidor" }).click();
  await page.getByRole("tab", { name: "Cadastro manual" }).click();
  await page.getByLabel("Nome do servidor / guilda *").fill(name);
  await page.getByLabel("URL da guilda (alvo do scraping) *").fill(url);

  const addResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/servers") && response.request().method() === "POST",
    { timeout: 15000 }
  );
  await page.getByRole("button", { name: "Salvar" }).click();
  await addResponsePromise;
  await expect(page.getByRole("dialog")).toBeHidden();
};
