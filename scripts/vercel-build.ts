// Build command untuk Vercel (dipanggil via `bun run build:prod`).
//
// Migrasi database hanya dijalankan pada deployment Production. Deployment
// Preview dan build lokal melewati langkah ini agar tidak ada preview yang
// mengubah skema database produksi.
import { spawnSync } from "node:child_process";

const env = process.env.VERCEL_ENV ?? "(kosong)";
const isProduction = process.env.VERCEL_ENV === "production";

function run(command: string, args: string[], label: string) {
  console.log(`\n[vercel-build] ${label}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.error || result.status !== 0) {
    console.error(`[vercel-build] gagal: ${label}`);
    process.exit(result.status ?? 1);
  }
}

if (isProduction) {
  if (!process.env.DIRECT_URL) {
    console.error("[vercel-build] DIRECT_URL belum diisi — migrasi produksi dibatalkan.");
    process.exit(1);
  }
  run("bun", ["x", "prisma", "migrate", "deploy"], "migrasi database produksi (DIRECT_URL)");
} else {
  console.log(`[vercel-build] VERCEL_ENV=${env} → migrasi dilewati`);
}

run("bun", ["scripts/copy-pdf-worker.ts"], "menyiapkan worker pdf.js");
run("bun", ["x", "next", "build"], "build Next.js");
