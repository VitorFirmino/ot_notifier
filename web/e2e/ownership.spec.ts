import { test, expect } from "@playwright/test";
import { createPool, uniqueTestEmail, deleteTestUser } from "./helpers/db";
import { signUpVerifyAndLogin, addServerManually } from "./helpers/auth";

const pool = createPool();

test.describe("A server added by one account is invisible to another", () => {
  const ownerEmail = uniqueTestEmail("e2e-owner");
  const intruderEmail = uniqueTestEmail("e2e-intruder");
  let ownedServerId: string | undefined;

  test.afterAll(async () => {
    if (ownedServerId) {
      const { deleteServerConfig } = await import(
        "../../src/infrastructure/storage/serverConfigManager"
      );
      await deleteServerConfig(ownedServerId).catch(() => {});
    }
    await deleteTestUser(pool, ownerEmail);
    await deleteTestUser(pool, intruderEmail);
    await pool.end();
  });

  test("the intruder's dashboard never shows the owner's server", async ({ browser }) => {
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await signUpVerifyAndLogin(ownerPage, pool, ownerEmail, "E2E Owner");

    await addServerManually(ownerPage, {
      url: "https://example.com/?subtopic=guilds&action=view&GuildName=Owner+Only",
      name: "Owner Only Guild",
    });
    await expect(ownerPage.getByRole("heading", { name: "Owner Only Guild" })).toBeVisible();

    const ownServers = (await (await ownerPage.request.get("/api/servers")).json()) as Array<{
      serverId: string;
      serverName: string;
    }>;
    ownedServerId = ownServers.find((server) => server.serverName === "Owner Only Guild")?.serverId;
    expect(ownedServerId).toBeDefined();

    const intruderContext = await browser.newContext();
    const intruderPage = await intruderContext.newPage();
    await signUpVerifyAndLogin(intruderPage, pool, intruderEmail, "E2E Intruder");

    await expect(intruderPage.getByRole("heading", { name: "Owner Only Guild" })).not.toBeVisible();
    await expect(intruderPage.getByText("Servidores Open Tibia Monitored (0)")).toBeVisible();

    const intruderServers = (await (await intruderPage.request.get("/api/servers")).json()) as unknown[];
    expect(intruderServers).toHaveLength(0);

    await ownerContext.close();
    await intruderContext.close();
  });
});
