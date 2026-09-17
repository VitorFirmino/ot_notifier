import { test, expect } from "./helpers/fixtures";
import { uniqueTestEmail, deleteTestUser } from "./helpers/db";
import { signUpVerifyAndLogin, addServerManually } from "./helpers/auth";

test.describe("Filtering the server list from the top bar", () => {
  const email = uniqueTestEmail("e2e-filter");
  const createdServerIds: string[] = [];

  test.afterAll(async ({ browser, pool }) => {
    if (createdServerIds.length > 0) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto("/app/login");
      const { loginAsExistingUser, TEST_PASSWORD } = await import("./helpers/auth");
      await loginAsExistingUser(page, email, TEST_PASSWORD);
      for (const id of createdServerIds) {
        await page.request.delete(`/api/servers/${id}`).catch(() => {});
      }
      await context.close();
    }
    await deleteTestUser(pool, email);
  });

  test("typing a server name hides the other cards", async ({ page, pool }) => {
    await signUpVerifyAndLogin(page, pool, email, "E2E Filter Test");

    await addServerManually(page, {
      url: "https://example.com/?subtopic=guilds&action=view&GuildName=Filter+Alpha",
      name: "Filter Alpha Guild",
    });
    await addServerManually(page, {
      url: "https://example.com/?subtopic=guilds&action=view&GuildName=Filter+Beta",
      name: "Filter Beta Guild",
    });
    await expect(page.getByRole("heading", { name: "Filter Alpha Guild" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Filter Beta Guild" })).toBeVisible();

    const servers = ((await (await page.request.get("/api/servers")).json()).data) as Array<{
      serverId: string;
      serverName: string;
    }>;
    for (const name of ["Filter Alpha Guild", "Filter Beta Guild"]) {
      const found = servers.find((server) => server.serverName === name);
      if (found) createdServerIds.push(found.serverId);
    }

    await page.getByPlaceholder("Buscar servidor, personagem ou guilda...").fill("Alpha");
    await expect(page.getByRole("heading", { name: "Filter Alpha Guild" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Filter Beta Guild" })).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Servidores Open Tibia Monitored (1)" })).toBeVisible();

    await page.getByPlaceholder("Buscar servidor, personagem ou guilda...").fill("");
    await expect(page.getByRole("heading", { name: "Filter Beta Guild" })).toBeVisible();
  });
});
