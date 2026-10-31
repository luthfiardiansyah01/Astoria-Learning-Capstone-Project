// Seed DEV: pengguna demo + dokumen modul contoh (agar aplikasi langsung bisa diuji).
// JANGAN dijalankan di produksi — pakai scripts/seed-prod.ts.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  SAMPLE_DOC,
  SAMPLE_DOC_FILE_NAME,
  SAMPLE_DOC_METADATA,
  SAMPLE_DOC_MODERATION,
  buildSampleChunks,
} from "./sample-module";

if (process.env.NODE_ENV === "production") {
  console.error("Seed demo tidak boleh dijalankan di produksi. Pakai: bun run seed:prod");
  process.exit(1);
}

const db = new PrismaClient();

const DEV_PASSWORD = "astoria123";

async function main() {
  // Pengguna demo — juga jadi akun yang bisa login (email + password dev)
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  const student =
    (await db.user.findUnique({ where: { id: "demo-student-ut" } })) ??
    (await db.user.create({
      data: {
        id: "demo-student-ut",
        name: "Raka Pratama",
        role: "mahasiswa",
        xp: 40,
        level: 1,
        streakDays: 1,
        email: "raka@ut.ac.id",
        passwordHash,
      },
    }));

  await db.user.updateMany({
    where: { id: "demo-student-ut", email: null },
    data: { email: "raka@ut.ac.id", passwordHash },
  });

  await db.user.upsert({
    where: { id: "demo-admin-ut" },
    update: {},
    create: {
      id: "demo-admin-ut",
      name: "Admin SOBAT ADI",
      role: "admin",
      email: "admin@ut.ac.id",
      passwordHash,
    },
  });

  await db.user.updateMany({
    where: { id: "demo-admin-ut", email: null },
    data: { email: "admin@ut.ac.id", passwordHash },
  });

  console.log(`Demo login: raka@ut.ac.id / admin@ut.ac.id — password: ${DEV_PASSWORD}`);

  const existing = await db.document.findFirst({
    where: { fileName: SAMPLE_DOC_FILE_NAME },
  });
  if (existing) {
    console.log("Seed sudah ada, lewati.");
    return;
  }

  await db.document.create({
    data: {
      fileName: SAMPLE_DOC_FILE_NAME,
      content: SAMPLE_DOC,
      wordCount: SAMPLE_DOC.trim().split(/\s+/).length,
      uploaderId: student.id,
      status: "approved",
      metadata: JSON.stringify(SAMPLE_DOC_METADATA),
      moderation: JSON.stringify(SAMPLE_DOC_MODERATION),
      chunks: { create: buildSampleChunks() },
    },
  });

  console.log("Seed selesai: 1 dokumen contoh + 2 pengguna demo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
