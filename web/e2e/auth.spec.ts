import { test, expect } from "@playwright/test";
import { createPool, uniqueTestEmail, markEmailVerified, deleteTestUser } from "./helpers/db";

test.describe("Signup, email verification, login, logout", () => {
  const email = uniqueTestEmail("e2e-auth");
  const password = "Str0ng!Pass2026";
  const pool = createPool();

  test.afterAll(async () => {
    await deleteTestUser(pool, email);
    await pool.end();
  });

  test("blocks access until the email is verified, then lets the same account in", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Não tem conta? Criar uma" }).click();
    await page.getByLabel("Nome:").fill("E2E Auth Test");
    await page.getByLabel("Email:").fill(email);
    await page.getByLabel("Senha:", { exact: true }).fill(password);
    await page.getByLabel("Repetir senha:").fill(password);
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(page.getByRole("heading", { name: "Confirme seu email" })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();

    await page.getByRole("button", { name: "Voltar para o login" }).click();
    await page.getByLabel("Email:").fill(email);
    await page.getByLabel("Senha:", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Confirme seu email" })).toBeVisible();

    await markEmailVerified(pool, email);

    await page.getByRole("button", { name: "Voltar para o login" }).click();
    await page.getByLabel("Email:").fill(email);
    await page.getByLabel("Senha:", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Dashboard Principal" })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  });
});
