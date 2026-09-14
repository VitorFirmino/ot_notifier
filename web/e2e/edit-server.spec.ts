import { test, expect } from "./helpers/fixtures";
import { uniqueTestEmail, deleteTestUser } from "./helpers/db";
import { signUpVerifyAndLogin, addServerManually } from "./helpers/auth";

test.describe("Editing an existing server", () => {
  const email = uniqueTestEmail("e2e-edit");
  let serverId: string | undefined;

  test.afterAll(async ({ pool }) => {
    if (serverId) {
      const { deleteServerConfig } = await import("../../src/infrastructure/storage/serverConfigManager");
      await deleteServerConfig(serverId).catch(() => {});
    }
    await deleteTestUser(pool, email);
  });

  test("changes to name and check interval are saved and reflected on the card", async ({ page, pool }) => {
    await signUpVerifyAndLogin(page, pool, email, "E2E Edit Test");

    await addServerManually(page, {
      url: "https://example.com/?subtopic=guilds&action=view&GuildName=Edit+Me",
      name: "Edit Me Guild",
    });
    await expect(page.getByRole("heading", { name: "Edit Me Guild" })).toBeVisible();

    const serversBeforeEdit = (await (await page.request.get("/api/servers")).json()) as Array<{
      serverId: string;
      serverName: string;
    }>;
    serverId = serversBeforeEdit.find((server) => server.serverName === "Edit Me Guild")?.serverId;
    expect(serverId).toBeDefined();

    await page.getByRole("button", { name: "Editar servidor", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Editar servidor OT" })).toBeVisible();
    await expect(page.getByLabel("Nome do servidor / guilda *")).toHaveValue("Edit Me Guild");

    await page.getByLabel("Nome do servidor / guilda *").fill("Edited Guild Name");
    await page.getByLabel("Intervalo (s)").fill("90");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await expect(page.getByRole("heading", { name: "Edited Guild Name" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Edit Me Guild", exact: true })).not.toBeVisible();

    const serversAfterEdit = (await (await page.request.get("/api/servers")).json()) as Array<{
      serverId: string;
      serverName: string;
      settings?: { checkInterval?: number };
    }>;
    const updated = serversAfterEdit.find((server) => server.serverId === serverId);
    expect(updated?.serverName).toBe("Edited Guild Name");
    expect(updated?.settings?.checkInterval).toBe(90000);
  });
});
