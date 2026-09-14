import { test, expect } from "@playwright/test";
import { createPool, uniqueTestEmail, deleteTestUser } from "./helpers/db";
import { signUpVerifyAndLogin } from "./helpers/auth";

test.describe("Testing a webhook from the global settings screen", () => {
  const pool = createPool();
  const email = uniqueTestEmail("e2e-globalsettings");

  test.afterAll(async () => {
    await deleteTestUser(pool, email);
    await pool.end();
  });

  test("a webhook URL that rejects the test message shows the failure alert", async ({ page }) => {
    await signUpVerifyAndLogin(page, pool, email, "E2E Global Settings Test");

    await page.getByRole("button", { name: "Configurações" }).click();
    await expect(page.getByRole("heading", { name: "Configurações Globais & Integrações" })).toBeVisible();

    await page.getByLabel("Discord webhook URL").fill("https://example.com/api/webhooks/fake/fake");
    await page.getByRole("button", { name: "Enviar teste Discord" }).click();
    await expect(
      page.getByText("Não foi possível enviar a mensagem de teste. Verifique a URL do webhook.")
    ).toBeVisible();
  });
});
