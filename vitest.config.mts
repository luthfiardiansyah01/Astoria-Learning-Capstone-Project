import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/unit/**/*.test.ts"],
    env: {
      TZ: "Asia/Jakarta",
      NODE_ENV: "test",
      // Nilai dummy: unit test tidak boleh menyentuh database produksi.
      DATABASE_URL: "postgresql://test:test@localhost:5432/sobadi_test",
      DIRECT_URL: "postgresql://test:test@localhost:5432/sobadi_test",
      NEXTAUTH_SECRET: "test-secret",
      NEXTAUTH_URL: "http://localhost:3000",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "src/lib/gamif.ts",
        "src/lib/rag.ts",
        "src/lib/plans.ts",
        "src/lib/validation.ts",
        "src/lib/fallback.ts",
        "src/lib/doc-fallback.ts",
        "src/lib/user.ts",
        "src/lib/rate-limit.ts",
        "src/lib/billing.ts",
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 65,
        statements: 75,
      },
    },
  },
});
