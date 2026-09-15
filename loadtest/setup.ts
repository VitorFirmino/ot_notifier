import fs from "node:fs";
import dotenv from "dotenv";
import { Pool } from "pg";
import { LOADTEST_API_BASE, LOADTEST_PASSWORD, LOADTEST_SESSION_FILE, LOADTEST_STORAGE_DIR } from "./config";

dotenv.config({ quiet: true });

const SERVER_COUNT = Number(process.argv[2] ?? "100");

const uniqueEmail = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

const extractCookie = (response: Response): string => {
  const cookies = response.headers.getSetCookie();
  if (cookies.length === 0) throw new Error("No Set-Cookie header in response");
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
};

const signUpVerifyAndLogin = async (pool: Pool, email: string): Promise<{ userId: string; cookie: string }> => {
  const authHeaders = { "Content-Type": "application/json", Origin: LOADTEST_API_BASE };

  const signupResponse = await fetch(`${LOADTEST_API_BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ email, password: LOADTEST_PASSWORD, name: "Load Test User" }),
  });
  if (!signupResponse.ok) throw new Error(`Signup failed: ${signupResponse.status} ${await signupResponse.text()}`);

  await pool.query('UPDATE "user" SET "emailVerified" = true WHERE email = $1', [email]);
  const idResult = await pool.query('SELECT id FROM "user" WHERE email = $1', [email]);
  const userId: string = idResult.rows[0].id;

  const loginResponse = await fetch(`${LOADTEST_API_BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ email, password: LOADTEST_PASSWORD }),
  });
  if (!loginResponse.ok) throw new Error(`Login failed: ${loginResponse.status} ${await loginResponse.text()}`);
  return { userId, cookie: extractCookie(loginResponse) };
};

const buildCharacters = (n: number): Record<string, { url: string; last_level: number; isOnline: boolean }> => {
  const chars: Record<string, { url: string; last_level: number; isOnline: boolean }> = {};
  for (let i = 0; i < n; i++) {
    chars[`Character${i}`] = {
      url: `https://example.com/character/Character${i}`,
      last_level: 100 + i,
      isOnline: i % 3 === 0,
    };
  }
  return chars;
};

const seedServers = async (userId: string, count: number): Promise<void> => {
  process.env.SERVER_STORAGE_DIR = LOADTEST_STORAGE_DIR;
  const { saveServerConfig } = await import("@infrastructure/storage/serverConfigManager");

  for (let i = 0; i < count; i++) {
    await saveServerConfig({
      serverId: `loadtest_server_${i}`,
      serverName: `Load Test Guild ${i}`,
      guild: {
        url: `https://example.com/?subtopic=guilds&action=view&GuildName=Load+Test+${i}`,
        enabled: true,
      },
      characters: buildCharacters(15),
      createdByUserId: userId,
      isWorking: true,
    });
  }
};

const main = async (): Promise<void> => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const email = uniqueEmail("loadtest");

  console.log(`Signing up ${email}...`);
  const { userId, cookie } = await signUpVerifyAndLogin(pool, email);

  console.log(`Seeding ${SERVER_COUNT} servers for user ${userId}...`);
  await seedServers(userId, SERVER_COUNT);
  await pool.end();

  fs.writeFileSync(
    LOADTEST_SESSION_FILE,
    JSON.stringify({ email, userId, cookie, apiBase: LOADTEST_API_BASE, count: SERVER_COUNT }, null, 2)
  );
  console.log(`Ready. Session written to ${LOADTEST_SESSION_FILE}.`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
