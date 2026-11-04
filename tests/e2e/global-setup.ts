import { execSync } from "node:child_process";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { E2E_USERS } from "./users";

const testDb =
  process.env.TEST_DATABASE_URL ??
  "postgresql://astoria:astoria@localhost:5434/astoria_test";

export default async function globalSetup() {
  process.env.DATABASE_URL = testDb;
  process.env.DIRECT_URL = testDb;

  execSync("bunx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testDb, DIRECT_URL: testDb },
    shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
  });

  const db = new PrismaClient({ log: [] });
  try {
    const tables = await db.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    `;
    if (tables.length > 0) {
      const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
      await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
    }

    const passwordHash = await bcrypt.hash(E2E_USERS.student.password, 10);

    await db.user.create({
      data: {
        email: E2E_USERS.student.email,
        name: E2E_USERS.student.name,
        passwordHash,
        role: "mahasiswa",
        plan: "premium",
        planExpiresAt: null,
        xp: 0,
        level: 1,
        streakDays: 1,
      },
    });
    await db.user.create({
      data: {
        email: E2E_USERS.home.email,
        name: E2E_USERS.home.name,
        passwordHash,
        role: "mahasiswa",
        xp: 120,
        level: 2,
        streakDays: 7,
      },
    });
    await db.user.create({
      data: {
        email: E2E_USERS.admin.email,
        name: E2E_USERS.admin.name,
        passwordHash,
        role: "admin",
      },
    });
    const helper = await db.user.create({
      data: {
        email: E2E_USERS.helper.email,
        name: E2E_USERS.helper.name,
        passwordHash,
        role: "mahasiswa",
      },
    });

    const student = await db.user.findUniqueOrThrow({ where: { email: E2E_USERS.student.email } });

    await db.document.create({
      data: {
        fileName: "Modul E2E Ekonomi",
        content:
          "BAB 1 PENGANTAR EKONOMI\nEkonomi adalah ilmu yang mempelajari perilaku manusia dalam memenuhi kebutuhan. " +
          "Permintaan dan penawaran menentukan harga pasar. Hukum permintaan menyatakan harga naik maka permintaan turun.",
        wordCount: 30,
        status: "approved",
        uploaderId: student.id,
      },
    });

    await db.document.create({
      data: {
        fileName: "Modul Pending E2E",
        content:
          "BAB 2 MANAJEMEN\nManajemen membahas perencanaan, pengorganisasian, dan pengendalian organisasi.",
        wordCount: 15,
        status: "pending",
        uploaderId: student.id,
      },
    });

    console.log(`E2E database siap (student=${student.id}, helper=${helper.id})`);
  } finally {
    await db.$disconnect();
  }
}
