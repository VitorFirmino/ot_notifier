import type { Pool } from "pg";

export interface TestSession {
  email: string;
  userId: string;
  sessionCookie: string;
}

export const createVerifiedUserSession = async (
  pool: Pool,
  emailPrefix: string,
  password = "correct horse battery staple"
): Promise<TestSession> => {
  const email = `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const { auth } = await import("@infrastructure/auth/auth");

  const signUpResult = await auth.api.signUpEmail({
    body: { email, password, name: "Integration Test User" },
  });
  await pool.query('UPDATE "user" SET "emailVerified" = true WHERE email = $1', [email]);

  const { headers } = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });
  const setCookie = headers.get("set-cookie");
  if (!setCookie) throw new Error("Login não retornou cookie de sessão.");

  return {
    email,
    userId: signUpResult.user.id,
    sessionCookie: setCookie.split(";")[0],
  };
};

export const deleteTestUser = async (pool: Pool, email: string): Promise<void> => {
  await pool.query('DELETE FROM "user" WHERE email = $1', [email]);
};
