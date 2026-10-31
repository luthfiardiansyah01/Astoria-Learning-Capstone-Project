// Menjalankan operasi Prisma/seed terhadap database PRODUKSI memakai .env.supabase.
// Pemakaian: bun scripts/db-prod.ts status | deploy | seed
import { readFileSync } from "fs";
import { spawnSync } from "child_process";
import path from "path";

const file = path.join(process.cwd(), ".env.supabase");

try {
  for (const line of readFileSync(file, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  console.error("Berkas .env.supabase tidak ditemukan. Buat dari .env.example lalu isi kredensial Supabase.");
  process.exit(1);
}

if (!process.env.DATABASE_URL?.includes("supabase")) {
  console.error("DATABASE_URL di .env.supabase bukan URL Supabase. Dibatalkan demi keamanan.");
  process.exit(1);
}

const action = process.argv[2] ?? "status";
const commands: Record<string, string[]> = {
  status: ["x", "prisma", "migrate", "status"],
  deploy: ["x", "prisma", "migrate", "deploy"],
  seed: ["scripts/seed-prod.ts"],
  check: ["scripts/check-db.ts"],
};

const args = commands[action];
if (!args) {
  console.error("Aksi tidak dikenal. Pakai: status | deploy | seed");
  process.exit(1);
}

const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
