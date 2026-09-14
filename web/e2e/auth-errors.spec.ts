import { test, expect } from "@playwright/test";
import { createPool, uniqueTestEmail, deleteTestUser } from "./helpers/db";
import { TEST_PASSWORD, signUpVerifyAndLogin, loginAsExistingUser } from "./helpers/auth";

const pool = createPool();

test.describe("Authentication error paths", () => {
  const email = uniqueTestEmail("e2e-autherr");

  test.afterAll(async () => {
    await deleteTestUser(pool, email);
    await pool.end();
  });

  test("signup form blocks mismatched and too-short passwords before hitting the API", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Não tem conta? Criar uma" }).click();
    await page.getByLabel("Nome:").fill("E2E Auth Errors");
    await page.getByLabel("Email:").fill(uniqueTestEmail("e2e-shortpw"));
    await page.getByLabel("Senha:", { exact: true }).fill("short1!");
    await page.getByLabel("Repetir senha:").fill("short1!");
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText("A senha deve ter pelo menos 8 caracteres.")).toBeVisible();

    await page.getByLabel("Senha:", { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel("Repetir senha:").fill("Different!Pass2026");
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText("As senhas não coincidem.")).toBeVisible();
  });

  test("signing up again with a registered email neither errors nor touches the existing account", async ({
    page,
  }) => {
    await signUpVerifyAndLogin(page, pool, email, "E2E Auth Errors");
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();

    const attackerPassword = "AttackerChosen!Pass2026";
    await page.getByRole("button", { name: "Não tem conta? Criar uma" }).click();
    await page.getByLabel("Nome:").fill("E2E Auth Errors Duplicate");
    await page.getByLabel("Email:").fill(email);
    await page.getByLabel("Senha:", { exact: true }).fill(attackerPassword);
    await page.getByLabel("Repetir senha:").fill(attackerPassword);
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByRole("heading", { name: "Confirme seu email" })).toBeVisible();

    await page.getByRole("button", { name: "Voltar para o login" }).click();
    await page.getByLabel("Email:").fill(email);
    await page.getByLabel("Senha:", { exact: true }).fill(attackerPassword);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(
      page.getByText("Não foi possível autenticar. Verifique seus dados e tente novamente.")
    ).toBeVisible();

    await loginAsExistingUser(page, email, TEST_PASSWORD);
  });

  test("logging in with the wrong password shows a generic error, not which field was wrong", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email:").fill(email);
    await page.getByLabel("Senha:", { exact: true }).fill("TotallyWrong!Pass2026");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(
      page.getByText("Não foi possível autenticar. Verifique seus dados e tente novamente.")
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dashboard Principal" })).not.toBeVisible();
  });

  test("requesting a password reset for an email that isn't registered still shows the generic success message", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Esqueci minha senha" }).click();
    await page.getByLabel("Email:").fill(uniqueTestEmail("e2e-doesnotexist"));
    await page.getByRole("button", { name: "Enviar link de recuperação" }).click();
    await expect(
      page.getByText("Se esse email existir na nossa base, você vai receber um link de recuperação em instantes.")
    ).toBeVisible();
  });
});
