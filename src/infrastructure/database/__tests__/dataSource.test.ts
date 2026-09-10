import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppDataSource } from "../dataSource";
import { UserServerSubscription } from "../entities/UserServerSubscription";

describe("AppDataSource", () => {
  const testUserId = "test-user-1";

  beforeAll(async () => {
    await AppDataSource.initialize();
    await AppDataSource.query('INSERT INTO "user" (id, name, email, "emailVerified") VALUES ($1, $2, $3, false)', [
      testUserId,
      "Test User",
      `${testUserId}@example.com`,
    ]);
  });

  afterAll(async () => {
    await AppDataSource.query('DELETE FROM "user" WHERE id = $1', [testUserId]);
    await AppDataSource.destroy();
  });

  it("persists and reads back a UserServerSubscription", async () => {
    const repo = AppDataSource.getRepository(UserServerSubscription);
    const saved = await repo.save(
      repo.create({ userId: testUserId, serverId: "server1_ntobrasil_com_br" })
    );

    const found = await repo.findOneByOrFail({ id: saved.id });
    expect(found.userId).toBe(testUserId);
    expect(found.notifyLevelUp).toBe(true);

    await repo.delete({ id: saved.id });
  });
});
