// GET /api/profile — statistik mahasiswa, lencana, aktivitas kuis terakhir

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUsers } from "@/lib/user";
import { BADGE_META, xpForNextLevel } from "@/lib/gamif";

export async function GET() {
  try {
    const { student } = await getOrCreateUsers();

    const [badges, attempts, docCount] = await Promise.all([
      db.badge.findMany({ where: { userId: student.id }, orderBy: { earnedAt: "desc" } }),
      db.quizAttempt.findMany({
        where: { userId: student.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          question: { select: { soal: true, tingkat: true } },
          document: { select: { fileName: true } },
        },
      }),
      db.document.count({ where: { uploaderId: student.id } }),
    ]);

    const avgSkor =
      attempts.length > 0
        ? Math.round(attempts.reduce((a, b) => a + b.skor, 0) / attempts.length)
        : null;

    return NextResponse.json({
      profile: {
        nama: student.name,
        role: student.role,
        xp: student.xp,
        level: student.level,
        streak: student.streakDays,
        totalQuiz: attempts.length,
        avgSkor,
        docCount,
        xpProgress: xpForNextLevel(student.xp),
        badges: badges.map((b) => ({
          name: b.name,
          emoji: BADGE_META[b.name]?.emoji ?? "🏅",
          desc: BADGE_META[b.name]?.desc ?? "Lencana Astoria",
          earnedAt: b.earnedAt,
        })),
        badgeCatalog: Object.entries(BADGE_META).map(([name, m]) => ({
          name,
          ...m,
          earned: badges.some((b) => b.name === name),
        })),
        recentAttempts: attempts.map((a) => ({
          id: a.id,
          soal: a.question.soal,
          tingkat: a.question.tingkat,
          dokumen: a.document.fileName,
          skor: a.skor,
          xp: a.xpDiperoleh,
          createdAt: a.createdAt,
        })),
      },
    });
  } catch (e) {
    console.error("[/api/profile]", e);
    return NextResponse.json({ error: "Gagal memuat profil" }, { status: 500 });
  }
}
