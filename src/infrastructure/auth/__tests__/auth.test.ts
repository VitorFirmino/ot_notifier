import { describe, it, expect, afterAll } from "vitest";
import { Pool } from "pg";
import { auth } from "../auth";

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
});
