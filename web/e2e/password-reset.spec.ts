import { test, expect } from "./helpers/fixtures";
import { uniqueTestEmail, markEmailVerified, deleteTestUser, getPasswordResetToken } from "./helpers/db";
import { TEST_PASSWORD, loginAsExistingUser } from "./helpers/auth";

test.describe("Forgot password", () => {
  const email = uniqueTestEmail("e2e-reset");
  const newPassword = "EvenStr0nger!Pass2026";

  test.afterAll(async ({ pool }) => {
    await deleteTestUser(pool, email);
  });

  test("requesting a reset link and using it changes the password that actually logs in", async ({
    page,
    pool,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Não tem conta? Criar uma" }).click();
    await page.getByLabel("Nome:").fill("E2E Reset Test");
    await page.getByLabel("Email:").fill(email);
    await page.getByLabel("Senha:", { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel("Repetir senha:").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByRole("heading", { name: "Confirme seu email" })).toBeVisible();
    await markEmailVerified(pool, email);
    await page.getByRole("button", { name: "Voltar para o login" }).click();

    await page.getByRole("button", { name: "Esqueci minha senha" }).click();
    await expect(page.getByRole("heading", { name: "Recuperar senha" })).toBeVisible();
    await page.getByLabel("Email:").fill(email);
    await page.getByRole("button", { name: "Enviar link de recuperação" }).click();
    await expect(
      page.getByText("Se esse email existir na nossa base, você vai receber um link de recuperação em instantes.")
    ).toBeVisible();

    const token = await getPasswordResetToken(pool, email);
    await page.goto(`/reset-password?token=${token}`);

    await expect(page.getByRole("heading", { name: "Nova senha" })).toBeVisible();
    await page.getByLabel("Nova senha:").fill(newPassword);
    await page.getByLabel("Repetir senha:").fill(newPassword);
    await page.getByRole("button", { name: "Redefinir senha" }).click();
    await expect(page.getByText("Senha alterada com sucesso.")).toBeVisible();

    await page.getByRole("button", { name: "Ir para o login" }).click();

    await page.getByLabel("Email:").fill(email);
    await page.getByLabel("Senha:", { exact: true }).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(
      page.getByText("Não foi possível autenticar. Verifique seus dados e tente novamente.")
    ).toBeVisible();

    await loginAsExistingUser(page, email, newPassword);
  });
});
