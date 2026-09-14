import { test, expect } from "./helpers/fixtures";
import { uniqueTestEmail, deleteTestUser } from "./helpers/db";
import { signUpVerifyAndLogin } from "./helpers/auth";

test.describe("Testing a webhook from the global settings screen", () => {
  const email = uniqueTestEmail("e2e-globalsettings");

  test.afterAll(async ({ pool }) => {
    await deleteTestUser(pool, email);
  });

  test("a webhook URL that rejects the test message shows the failure alert", async ({ page, pool }) => {
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
