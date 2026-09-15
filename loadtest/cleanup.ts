import fs from "node:fs";
import dotenv from "dotenv";
import { Pool } from "pg";
import { LOADTEST_SESSION_FILE, LOADTEST_STORAGE_DIR } from "./config";

dotenv.config({ quiet: true });

const cleanupBullMqSchedulers = async (): Promise<void> => {
  const { getServerCheckQueue } = await import("../src/infrastructure/queue/serverQueueManager");
  const queue = getServerCheckQueue();

  const schedulers = await queue.getJobSchedulers(0, 10000, false);
  const staleSchedulers = schedulers.filter((scheduler) =>
    scheduler.key?.startsWith("check-server:loadtest_server_")
  );

  for (const scheduler of staleSchedulers) {
    await queue.removeJobScheduler(scheduler.key!);
  }

  console.log(`Removed ${staleSchedulers.length} leftover BullMQ job schedulers.`);
  await queue.close();
};

const main = async (): Promise<void> => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  if (fs.existsSync(LOADTEST_SESSION_FILE)) {
    const { email } = JSON.parse(fs.readFileSync(LOADTEST_SESSION_FILE, "utf-8")) as { email: string };
    await pool.query('DELETE FROM "user" WHERE email = $1', [email]);
    console.log(`Deleted test user ${email}.`);
    fs.unlinkSync(LOADTEST_SESSION_FILE);
  }

  const result = await pool.query('DELETE FROM "server_config" WHERE "serverId" LIKE $1', ["loadtest_server_%"]);
  console.log(`Deleted ${result.rowCount ?? 0} leftover server_config rows.`);
  await pool.end();

  if (fs.existsSync(LOADTEST_STORAGE_DIR)) {
    fs.rmSync(LOADTEST_STORAGE_DIR, { recursive: true, force: true });
    console.log(`Removed ${LOADTEST_STORAGE_DIR}.`);
  }

  await cleanupBullMqSchedulers();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
