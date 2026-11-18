import { logger } from "@/lib/logger";
// GET /api/profile — statistik mahasiswa, lencana, aktivitas kuis terakhir
// DELETE /api/profile — hapus akun (dengan konfirmasi password)

import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { BADGE_META, xpForNextLevel } from "@/lib/gamif";
import { effectivePlan } from "@/lib/plans";
import { deleteAccountSchema, readBody } from "@/lib/validation";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;
    const student = auth.user;

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
        plan: effectivePlan(student),
        planExpiresAt: student.planExpiresAt,
        trialUsedAt: student.trialUsedAt,
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
          desc: BADGE_META[b.name]?.desc ?? "Lencana SOBAT ADI",
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
    logger.error("[/api/profile]", { error: e });
    return NextResponse.json({ error: "Gagal memuat profil" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;
    const user = auth.user;

    if (user.role === "admin") {
      return NextResponse.json(
        { error: "Akun admin tidak dapat dihapus dari halaman ini." },
        { status: 400 }
      );
    }
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Akun ini tidak memakai password. Hubungi admin." },
        { status: 400 }
      );
    }

    const parsed = await readBody(req, deleteAccountSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const matches = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!matches) {
      return NextResponse.json({ error: "Password salah." }, { status: 400 });
    }

    // Riwayat pembayaran wajib dipertahankan untuk audit; penghapusan penuh
    // dilakukan manual oleh admin melalui jalur yang tercatat.
    const payments = await db.payment.count({ where: { userId: user.id } });
    if (payments > 0) {
      return NextResponse.json(
        {
          error:
            "Akun memiliki riwayat pembayaran sehingga tidak dapat dihapus otomatis. " +
            "Ajukan penghapusan ke admin agar data pembayaran tetap sesuai kewajiban audit.",
          code: "has_payments",
        },
        { status: 409 }
      );
    }

    // Hapus tim yang tidak akan punya anggota lain setelah akun ini dihapus.
    const ownedTeams = await db.teamMember.findMany({
      where: { userId: user.id, role: "owner" },
      select: { teamId: true },
    });
    for (const { teamId } of ownedTeams) {
      const others = await db.teamMember.count({
        where: { teamId, userId: { not: user.id } },
      });
      if (others === 0) {
        await db.team.delete({ where: { id: teamId } }).catch(() => null);
      }
    }

    await db.user.delete({ where: { id: user.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("[/api/profile DELETE]", { error: e });
    return NextResponse.json({ error: "Gagal menghapus akun." }, { status: 500 });
  }
}
