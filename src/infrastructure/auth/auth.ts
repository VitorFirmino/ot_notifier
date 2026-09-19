import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { isValid as isNotDisposableEmail } from "mailchecker";
import { getAuthEnv } from "@shared/utils/authEnv";
import { sendPasswordResetEmail, sendVerificationEmail } from "@infrastructure/email/resend";

const {
  DATABASE_URL,
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  DASHBOARD_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  COOKIE_DOMAIN,
} = getAuthEnv();

export const auth = betterAuth({
  database: new Pool({ connectionString: DATABASE_URL, max: 10 }),
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL ?? "http://localhost:3001",
  trustedOrigins: [DASHBOARD_URL ?? "http://localhost:5173"],
  ...(COOKIE_DOMAIN
    ? { advanced: { crossSubDomainCookies: { enabled: true, domain: COOKIE_DOMAIN } } }
    : {}),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      try {
        await sendPasswordResetEmail({ to: user.email, resetUrl: url });
      } catch (err: unknown) {
        console.error("❌ Falha ao enviar email de recuperação de senha:", err);
      }
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      try {
        await sendVerificationEmail({ to: user.email, verifyUrl: url });
      } catch (err: unknown) {
        console.error("❌ Falha ao enviar email de verificação:", err);
      }
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      requireLocalEmailVerified: true,
    },
  },
  user: {
    validateUserInfo: async ({ user, source }) => {
      if (source.action !== "create-user") return;
      if (!user.email || !isNotDisposableEmail(user.email)) {
        return {
          error: "invalid_email",
          errorDescription: "Esse endereço de email não é aceito. Use um email pessoal ou corporativo válido.",
        };
      }
    },
  },
  ...(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
    ? { socialProviders: { google: { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET } } }
    : {}),
  rateLimit: {
    enabled: true,
    window: 60,
    max: process.env.E2E_TEST_MODE === "true" ? 1000 : 20,
    customRules: {
      "/sign-in/email": { window: 60, max: process.env.E2E_TEST_MODE === "true" ? 500 : 5 },
      "/sign-up/email": { window: 60, max: process.env.E2E_TEST_MODE === "true" ? 500 : 3 },
      "/request-password-reset": { window: 60, max: process.env.E2E_TEST_MODE === "true" ? 500 : 3 },
    },
  },
});
