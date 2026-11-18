// Backfill kolom pgvector dari embedding JSON yang sudah tersimpan.
// Tidak memanggil API AI. Jalankan:
//   bun scripts/backfill-vectors.ts            (DATABASE_URL saat ini)
//   bun scripts/backfill-vectors.ts --prod     (baca .env.supabase)
import { readFileSync } from "node:fs";

if (process.argv.includes("--prod")) {
  const env: Record<string, string> = {};
  for (const line of readFileSync(".env.supabase", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  process.env.DATABASE_URL = env.DATABASE_URL;
  process.env.DIRECT_URL = env.DIRECT_URL;
}

const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient({ log: [] });

const BATCH = 50;

try {
  const hasColumn = await db.$queryRawUnsafe<Array<{ ok: boolean }>>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name='Chunk' AND column_name='embeddingVec'
     ) AS ok`
  );
  if (!hasColumn[0]?.ok) {
    console.log("Kolom embeddingVec tidak ada; tidak ada yang dibackfill.");
    process.exit(0);
  }

  const rows = await db.$queryRawUnsafe<Array<{ id: string; embedding: string }>>(
    `SELECT id, embedding FROM "Chunk"
     WHERE embedding IS NOT NULL AND "embeddingVec" IS NULL
     LIMIT 5000`
  );
  console.log(`chunk perlu backfill: ${rows.length}`);

  let done = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    for (const row of batch) {
      try {
        const vector = JSON.parse(row.embedding) as number[];
        const literal = `[${vector.map((v) => (Number.isFinite(v) ? v : 0)).join(",")}]`;
        await db.$executeRawUnsafe(
          `UPDATE "Chunk" SET "embeddingVec" = $1::vector WHERE id = $2`,
          literal,
          row.id
        );
        done += 1;
      } catch {
        failed += 1;
      }
    }
    console.log(`progres ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }

  const remaining = await db.$queryRawUnsafe<Array<{ n: number }>>(
    `SELECT count(*)::int AS n FROM "Chunk" WHERE embedding IS NOT NULL AND "embeddingVec" IS NULL`
  );
  console.log(JSON.stringify({ done, failed, remaining: remaining[0]?.n ?? null }));
} finally {
  await db.$disconnect();
}

export {};
