import { describe, it, expect, vi, afterAll } from "vitest";
import { Pool } from "pg";
import { auth } from "../auth";

vi.mock("@infrastructure/email/resend", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

afterAll(async () => {
  await pool.end();
});

describe("auth", () => {
  it("signs a user up and returns a session", async () => {
    const email = `test-${Date.now()}@example.com`;
    try {
      const result = await auth.api.signUpEmail({
        body: { email, password: "correct horse battery staple", name: "Test User" },
      });

      expect(result.user.email).toBe(email);
    } finally {
      await pool.query('DELETE FROM "user" WHERE email = $1', [email]);
    }
  });

  describe("email verification requirement", () => {
    it("does not return a session token on signup (verification required first)", async () => {
      const email = `verify-req-${Date.now()}@example.com`;
      try {
        const result = await auth.api.signUpEmail({
          body: { email, password: "correct horse battery staple", name: "Verify Test" },
        });

        expect(result.token).toBeNull();
      } finally {
        await pool.query('DELETE FROM "user" WHERE email = $1', [email]);
      }
    });

    it("blocks sign-in for an unverified email with EMAIL_NOT_VERIFIED", async () => {
      const email = `verify-blocked-${Date.now()}@example.com`;
      const password = "correct horse battery staple";
      try {
        await auth.api.signUpEmail({ body: { email, password, name: "Verify Test" } });

        await expect(auth.api.signInEmail({ body: { email, password } })).rejects.toMatchObject({
          body: { code: "EMAIL_NOT_VERIFIED" },
        });
      } finally {
        await pool.query('DELETE FROM "user" WHERE email = $1', [email]);
      }
    });

    it("allows sign-in once emailVerified is set (simulating the verification link)", async () => {
      const email = `verify-ok-${Date.now()}@example.com`;
      const password = "correct horse battery staple";
      try {
        await auth.api.signUpEmail({ body: { email, password, name: "Verify Test" } });
        await pool.query('UPDATE "user" SET "emailVerified" = true WHERE email = $1', [email]);

        const result = await auth.api.signInEmail({ body: { email, password } });

        expect(result.user.email).toBe(email);
        expect(result.token).not.toBeNull();
      } finally {
        await pool.query('DELETE FROM "user" WHERE email = $1', [email]);
      }
    });
  });
});
