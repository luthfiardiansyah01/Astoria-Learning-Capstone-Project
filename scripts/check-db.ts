// Cek koneksi database + jumlah baris utama (tanpa menampilkan data sensitif).
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({ log: ["error"] });

try {
  const [users, documents, chunks, chatMessages, migrations] = await Promise.all([
    db.user.count(),
    db.document.count(),
    db.chunk.count(),
    db.chatMessage.count(),
    db.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations"`,
  ]);
  console.log(
    `OK via DATABASE_URL -> users=${users} documents=${documents} chunks=${chunks} chatMessages=${chatMessages} migrations=${migrations[0].count}`
  );
} catch (e) {
  console.error("GAGAL:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
