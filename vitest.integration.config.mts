import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const testDb =
  process.env.TEST_DATABASE_URL ??
  "postgresql://astoria:astoria@localhost:5433/astoria_test";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["tests/integration/global-setup.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      TZ: "Asia/Jakarta",
      NODE_ENV: "test",
      DATABASE_URL: testDb,
      DIRECT_URL: testDb,
      NEXTAUTH_SECRET: "integration-test-secret",
      NEXTAUTH_URL: "http://localhost:3000",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/app/api/**/*.ts", "src/lib/services/**/*.ts"],
      thresholds: {
        lines: 70,
        statements: 70,
        functions: 60,
        branches: 60,
      },
    },
  },
});
