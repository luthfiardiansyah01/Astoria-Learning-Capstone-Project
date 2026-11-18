import { logger } from "@/lib/logger";
// GET /api/profile/export — unduh seluruh data pribadi pengguna (JSON).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";

const MAX_ROWS = 5000;

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;
    const user = auth.user;

    const [documents, chats, attempts, payments, memberships, badges] = await Promise.all([
      db.document.findMany({
        where: { uploaderId: user.id },
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
        select: {
          fileName: true,
          content: true,
          wordCount: true,
          status: true,
          createdAt: true,
        },
      }),
      db.chatMessage.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
        select: { role: true, content: true, documentId: true, createdAt: true },
      }),
      db.quizAttempt.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
        select: {
          skor: true,
          xpDiperoleh: true,
          createdAt: true,
          question: { select: { soal: true, tingkat: true } },
          document: { select: { fileName: true } },
        },
      }),
      db.payment.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          orderId: true,
          provider: true,
          amount: true,
          status: true,
          durationDays: true,
          createdAt: true,
          paidAt: true,
          expiresAt: true,
        },
      }),
      db.teamMember.findMany({
        where: { userId: user.id },
        select: { role: true, joinedAt: true, team: { select: { name: true } } },
      }),
      db.badge.findMany({
        where: { userId: user.id },
        select: { name: true, earnedAt: true },
      }),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      account: {
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        planExpiresAt: user.planExpiresAt,
        emailVerifiedAt: user.emailVerifiedAt,
        xp: user.xp,
        level: user.level,
        streakDays: user.streakDays,
        createdAt: user.createdAt,
      },
      documents,
      chatMessages: chats,
      quizAttempts: attempts,
      payments,
      teamMemberships: memberships,
      badges,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="sobat-adi-data-${user.id}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    logger.error("[/api/profile/export GET]", { error: e });
    return NextResponse.json({ error: "Gagal mengekspor data." }, { status: 500 });
  }
}
