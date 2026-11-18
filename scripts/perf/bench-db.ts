// Analisis query database untuk baseline performa.
// Jalankan: bun scripts/perf/bench-db.ts
//
// Menampilkan ukuran tabel, rencana eksekusi query utama, dan index yang tersedia.

const databaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgresql://astoria:astoria@localhost:5434/astoria_test";

if (!/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\//.test(databaseUrl)) {
  throw new Error("Analisis ini hanya untuk database lokal (localhost).");
}
process.env.DATABASE_URL = databaseUrl;

const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient({ log: [] });

async function explain(label: string, sql: string) {
  const plan = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `EXPLAIN (ANALYZE, BUFFERS) ${sql}`
  );
  console.log(`\n=== ${label} ===`);
  for (const row of plan) console.log(Object.values(row)[0]);
}

try {
  const sizes = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`
    SELECT
      count(*)::int AS rows,
      pg_size_pretty(sum(pg_column_size(content))::bigint) AS content_total,
      pg_size_pretty(avg(pg_column_size(content))::bigint) AS content_avg,
      pg_size_pretty(pg_total_relation_size('"Document"')) AS table_size
    FROM "Document"`);
  console.log("Document sizes:", JSON.stringify(sizes[0], null, 2));

  await explain(
    "Dokumen: semua kolom + ORDER BY createdAt",
    `SELECT id, "fileName", "wordCount", status, metadata, moderation, "createdAt", "uploaderId"
     FROM "Document" ORDER BY "createdAt" DESC`
  );

  await explain(
    "Dokumen: kolom minimal + LIMIT 50",
    `SELECT id, "fileName", "wordCount", status, "createdAt", "uploaderId"
     FROM "Document" ORDER BY "createdAt" DESC LIMIT 50`
  );

  await explain(
    "Task proyek (1.000 baris)",
    `SELECT id, title, status, "order", "assigneeId", "dueDate"
     FROM "Task" WHERE "projectId" = 'bench-project-0' ORDER BY status, "order"`
  );

  await explain(
    "Activity feed tim (LIMIT 20)",
    `SELECT id, type, "userId", "taskId", "createdAt"
     FROM "ActivityEvent" WHERE "teamId" = 'bench-team' ORDER BY "createdAt" DESC LIMIT 20`
  );

  const idx = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`
    SELECT tablename, indexname FROM pg_indexes
    WHERE schemaname='public' AND tablename IN ('Document','Task','ActivityEvent')
    ORDER BY tablename, indexname`);
  console.log("\n=== Index terkait ===");
  for (const row of idx) console.log(`${row.tablename}: ${row.indexname}`);
} finally {
  await db.$disconnect();
}

export {};
