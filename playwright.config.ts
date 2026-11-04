import { defineConfig } from "@playwright/test";

const testDb =
  process.env.TEST_DATABASE_URL ??
  "postgresql://astoria:astoria@localhost:5433/astoria_test";

// Pastikan seluruh proses Playwright memakai database uji, bukan produksi.
process.env.DATABASE_URL = testDb;
process.env.DIRECT_URL = testDb;
process.env.NEXTAUTH_URL = "http://127.0.0.1:3100";
process.env.NEXTAUTH_SECRET = "e2e-only-secret";
process.env.AI_BASE_URL = "http://127.0.0.1:4010/v1";
process.env.AI_API_KEY = "e2e-test";
process.env.AI_MODEL = "mock-model";
process.env.AI_FALLBACK_MODELS = "mock-model";
process.env.AI_EMBED_MODEL = "mock-embed";
process.env.UPSTASH_REDIS_REST_URL = "";
process.env.UPSTASH_REDIS_REST_TOKEN = "";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  globalSetup: "./tests/e2e/global-setup.ts",
  webServer: [
    {
      command: "bun tests/e2e/mock-ai-server.ts",
      url: "http://127.0.0.1:4010/health",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "bun run start:e2e",
      url: "http://127.0.0.1:3100/login",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATABASE_URL: testDb,
        DIRECT_URL: testDb,
        NEXTAUTH_URL: "http://127.0.0.1:3100",
        NEXTAUTH_SECRET: "e2e-only-secret",
        AI_BASE_URL: "http://127.0.0.1:4010/v1",
        AI_API_KEY: "e2e-test",
        AI_MODEL: "mock-model",
        AI_FALLBACK_MODELS: "mock-model",
        AI_EMBED_MODEL: "mock-embed",
        UPSTASH_REDIS_REST_URL: "",
        UPSTASH_REDIS_REST_TOKEN: "",
      },
    },
  ],
});
