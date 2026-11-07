// Backfill satu kali: beri trial Premium 7 hari ke pengguna Free yang belum pernah trial.
// Aman dijalankan berulang: pengguna yang sudah trial / sudah Premium tidak disentuh.
import { PrismaClient } from "@prisma/client";
import { TRIAL_MS } from "../src/lib/plans";

const db = new PrismaClient({ log: [] });

try {
  const now = new Date();
  const candidates = await db.user.findMany({
    where: { role: { not: "admin" }, plan: "free", trialUsedAt: null, emailVerifiedAt: { not: null } },
    select: { id: true, email: true, name: true },
  });

  if (candidates.length === 0) {
    console.log("Tidak ada pengguna Free yang perlu diberi trial.");
  } else {
    const result = await db.user.updateMany({
      where: { id: { in: candidates.map((u) => u.id) } },
      data: {
        plan: "premium",
        planExpiresAt: new Date(now.getTime() + TRIAL_MS),
        trialUsedAt: now,
      },
    });
    console.log(`Trial Premium 7 hari diberikan ke ${result.count} pengguna:`);
    for (const user of candidates) {
      console.log(`- ${user.name} <${user.email ?? "tanpa email"}>`);
    }
  }
} finally {
  await db.$disconnect();
}
