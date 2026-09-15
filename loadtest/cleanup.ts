import fs from "node:fs";
import dotenv from "dotenv";
import { Pool } from "pg";
import { LOADTEST_SESSION_FILE, LOADTEST_STORAGE_DIR } from "./config";

dotenv.config({ quiet: true });

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
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
