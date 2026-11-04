// Seed satu akun Free Plan untuk pengujian.
// Kredensial dibaca dari env agar password tidak tersimpan di repo.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient({ log: [] });

const email = process.env.SEED_FREE_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_FREE_PASSWORD;
const name = process.env.SEED_FREE_NAME?.trim() || "Free Plan Seed";

if (!email || !password) {
  throw new Error("Isi SEED_FREE_EMAIL dan SEED_FREE_PASSWORD terlebih dahulu.");
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error("SEED_FREE_EMAIL bukan alamat email yang valid.");
}
if (password.length < 8) {
  throw new Error("SEED_FREE_PASSWORD minimal 8 karakter.");
}

try {
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await db.user.upsert({
    where: { email },
    update: {
      name,
      role: "mahasiswa",
      plan: "free",
      planExpiresAt: null,
      // Tandai trial sudah terpakai agar akun ini tidak ikut di-upgrade
      // oleh backfill trial dan tetap Free Plan.
      trialUsedAt: new Date("2026-01-01T00:00:00.000Z"),
      passwordHash,
    },
    create: {
      email,
      name,
      passwordHash,
      role: "mahasiswa",
      plan: "free",
      planExpiresAt: null,
      trialUsedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  });

  console.log("Akun Free Plan siap:");
  console.log(`- Email : ${user.email}`);
  console.log(`- Nama  : ${user.name}`);
  console.log(`- Plan  : ${user.plan}`);
  console.log(`- Trial : sudah terpakai (tetap Free)`);
  console.log("Password: gunakan nilai SEED_FREE_PASSWORD yang Anda isi.");
} finally {
  await db.$disconnect();
}
