import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const WEB_PORT = 5175;
const API_PORT = 3055;

const E2E_STORAGE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".e2e-storage");
process.env.SERVER_STORAGE_DIR = E2E_STORAGE_DIR;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  timeout: 30000,
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: `pnpm --dir .. api`,
      url: `http://localhost:${API_PORT}/api/stats`,
      timeout: 60000,
      reuseExistingServer: !process.env.CI,
      env: {
        API_PORT: String(API_PORT),
        DASHBOARD_URL: `http://localhost:${WEB_PORT}`,
        E2E_TEST_MODE: "true",
        ADMIN_EMAILS: "e2e-admin@example.com",
        SERVER_STORAGE_DIR: E2E_STORAGE_DIR,
      },
    },
    {
      command: `pnpm exec vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_PROXY_TARGET: `http://localhost:${API_PORT}`,
      },
    },
  ],
});
