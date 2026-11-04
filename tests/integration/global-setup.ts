import { execSync } from "node:child_process";

const testDb =
  process.env.TEST_DATABASE_URL ??
  "postgresql://astoria:astoria@localhost:5434/astoria_test";

export default function setup() {
  // Selalu arahkan migrasi ke database uji, bukan DATABASE_URL produksi.
  const env = { ...process.env, DATABASE_URL: testDb, DIRECT_URL: testDb };
  execSync("bunx prisma migrate deploy", {
    stdio: "inherit",
    env,
    shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
  });
}
