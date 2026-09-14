import { test as base } from "@playwright/test";
import type { Pool } from "pg";
import { createPool } from "./db";

interface WorkerFixtures {
  pool: Pool;
}

export const test = base.extend<object, WorkerFixtures>({
  pool: [
    async ({}, use) => {
      const pool = createPool();
      await use(pool);
      await pool.end();
    },
    { scope: "worker" },
  ],
});

export { expect } from "@playwright/test";
