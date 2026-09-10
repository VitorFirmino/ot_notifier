import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { getAuthEnv } from "@shared/utils/authEnv";

const { DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, DASHBOARD_URL } = getAuthEnv();

export const auth = betterAuth({
  database: new Pool({ connectionString: DATABASE_URL, max: 10 }),
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL ?? "http://localhost:3001",
  trustedOrigins: [DASHBOARD_URL ?? "http://localhost:5173"],
  emailAndPassword: {
    enabled: true,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 20,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
    },
  },
});
