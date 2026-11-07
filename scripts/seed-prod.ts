// Seed PRODUKSI: satu akun admin dari env + dokumen modul contoh.
// Tanpa akun demo berpassword publik. Jalankan: bun run seed:prod
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  SAMPLE_DOC,
  SAMPLE_DOC_FILE_NAME,
  SAMPLE_DOC_METADATA,
  SAMPLE_DOC_MODERATION,
  buildSampleChunks,
} from "./sample-module";

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Admin SOBAT ADI";

  if (!email || !password) {
    throw new Error(
      "Isi SEED_ADMIN_EMAIL dan SEED_ADMIN_PASSWORD di .env (jangan commit nilainya), lalu jalankan lagi."
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("SEED_ADMIN_EMAIL bukan alamat email yang valid.");
  }
  if (password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD minimal 12 karakter.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Password hanya dipakai saat akun dibuat; seed ulang tidak menimpa password lama.
  const admin = await db.user.upsert({
    where: { email },
    update: { role: "admin", name, emailVerifiedAt: new Date() },
    create: { email, name, role: "admin", passwordHash, emailVerifiedAt: new Date() },
  });
  console.log(`Admin siap: ${admin.email} (${admin.role})`);

  const existing = await db.document.findFirst({
    where: { fileName: SAMPLE_DOC_FILE_NAME },
  });
  if (existing) {
    console.log("Dokumen contoh sudah ada, lewati.");
  } else {
    await db.document.create({
      data: {
        fileName: SAMPLE_DOC_FILE_NAME,
        content: SAMPLE_DOC,
        wordCount: SAMPLE_DOC.trim().split(/\s+/).length,
        uploaderId: admin.id,
        status: "approved",
        metadata: JSON.stringify(SAMPLE_DOC_METADATA),
        moderation: JSON.stringify(SAMPLE_DOC_MODERATION),
        chunks: { create: buildSampleChunks() },
      },
    });
    console.log("Dokumen modul contoh dibuat (status approved).");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
