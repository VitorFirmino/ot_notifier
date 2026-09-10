import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { getAuthEnv } from "@shared/utils/authEnv";
import { sendPasswordResetEmail } from "@infrastructure/email/resend";

const { DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, DASHBOARD_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } =
  getAuthEnv();

export const auth = betterAuth({
  database: new Pool({ connectionString: DATABASE_URL, max: 10 }),
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL ?? "http://localhost:3001",
  trustedOrigins: [DASHBOARD_URL ?? "http://localhost:5173"],
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ to: user.email, resetUrl: url });
    },
  },
  ...(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
    ? { socialProviders: { google: { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET } } }
    : {}),
  rateLimit: {
    enabled: true,
    window: 60,
    max: 20,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/request-password-reset": { window: 60, max: 3 },
    },
  },
});
