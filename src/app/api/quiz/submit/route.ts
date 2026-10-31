// POST /api/quiz/submit — evaluasi jawaban + gamifikasi (Seksi 6 spesifikasi):
//   1. Kumpulkan data kontekstual (XP, streak, riwayat)
//   2. AI Quiz Evaluator → {skor, xp_diperoleh, badge_baru, feedback, koreksi, level_naik}
//   3. Penguji trigger badge deterministik di server
//   4. Update XP/level/streak mahasiswa
//   5. UI menerima flag animasi: xpGained, badgeBaru, levelNaik

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { QUIZ_EVALUATOR_PROMPT, buildQuizEvaluatorUserTurn, PARAMS } from "@/lib/prompts";
import { chatJSON } from "@/lib/ai";
import { FALLBACK_RESPONSES } from "@/lib/fallback";
import {
  checkBadgeTriggers,
  clampSkor,
  clampXp,
  levelFromXp,
  BADGE_META,
} from "@/lib/gamif";
import { updateStreak } from "@/lib/user";
import { requireUser, canUseDocument, forbidden } from "@/lib/current-user";
import { guardAi } from "@/lib/rate-limit";
import { quizSubmitSchema, readBody } from "@/lib/validation";

export const maxDuration = 60;

interface EvalResult {
  skor: number;
  xp_diperoleh: number;
  badge_baru: string | null;
  feedback: string;
  koreksi: string;
  level_naik: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;
    const student = auth.user;
    const limited = await guardAi(student.id);
    if (limited) return limited;
    const parsed = await readBody(req, quizSubmitSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { questionId, jawaban } = parsed.data;

    const question = await db.quizQuestion.findUnique({
      where: { id: questionId },
      include: { document: true },
    });
    if (!question) {
      return NextResponse.json({ error: "Soal tidak ditemukan" }, { status: 404 });
    }

    if (!canUseDocument(student, question.document)) return forbidden("Soal ini bukan dari dokumenmu.");

    // ── Data kontekstual untuk evaluator & trigger badge ──
    const [answeredInThisDoc, last5, earnedBadges, firstLanjutDone] = await Promise.all([
      db.quizAttempt.count({
        where: { userId: student.id, documentId: question.documentId },
      }),
      db.quizAttempt.findMany({
        where: { userId: student.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { skor: true },
      }),
      db.badge.findMany({ where: { userId: student.id }, select: { name: true } }),
      db.quizAttempt.findFirst({
        where: { userId: student.id, question: { tingkat: "Lanjut" } },
        select: { id: true },
      }),
    ]);

    const avgLast5 =
      last5.length > 0 ? last5.reduce((a, b) => a + b.skor, 0) / last5.length : null;
    const alreadyEarned = earnedBadges.map((b) => b.name);
    const isFirstLanjut = question.tingkat === "Lanjut" && !firstLanjutDone;
    const streakDays = updateStreak(student.lastActive, student.streakDays);

    // ── AI Quiz Evaluator (Seksi 6.1) ──
    let result: EvalResult;
    try {
      result = await chatJSON<EvalResult>(
        [
          { role: "system", content: QUIZ_EVALUATOR_PROMPT },
          {
            role: "user",
            content: buildQuizEvaluatorUserTurn({
              soal: question.soal,
              kunci: question.kunci,
              jawaban: jawaban.trim(),
              currentXp: student.xp,
              streakDays,
              totalAnswered: await db.quizAttempt.count({ where: { userId: student.id } }),
              answeredInThisDoc,
              tingkat: question.tingkat,
              avgLast5,
              firstLanjut: isFirstLanjut,
            }),
          },
        ],
        PARAMS.gamif_eval
      );
    } catch (e) {
      console.error("[/api/quiz/submit] evaluator gagal:", e);
      return NextResponse.json(
        { error: FALLBACK_RESPONSES.api_error, code: "api_error" },
        { status: 500 }
      );
    }

    // ── Normalisasi + penguji server-side ──
    const skor = clampSkor(result.skor);
    const xpDiperoleh = clampXp(result.xp_diperoleh);
    const newXp = student.xp + xpDiperoleh;
    const newLevel = levelFromXp(newXp);
    const levelNaik = newLevel > student.level;

    // Badge: prioritaskan hasil AI jika valid, jika tidak cek trigger deterministik
    const serverBadge = checkBadgeTriggers({
      answeredInThisDoc: answeredInThisDoc + 1,
      streakDays,
      avgLast5,
      isFirstLanjut,
      alreadyEarned,
    });
    const aiBadge =
      result.badge_baru && BADGE_META[result.badge_baru] && !alreadyEarned.includes(result.badge_baru)
        ? result.badge_baru
        : null;
    const badgeBaru = serverBadge ?? aiBadge;

    if (badgeBaru) {
      await db.badge.upsert({
        where: { userId_name: { userId: student.id, name: badgeBaru } },
        update: {},
        create: { userId: student.id, name: badgeBaru },
      });
    }

    // ── Simpan attempt + update user ──
    const attempt = await db.quizAttempt.create({
      data: {
        userId: student.id,
        questionId: question.id,
        documentId: question.documentId,
        jawaban: jawaban.trim(),
        skor,
        xpDiperoleh: xpDiperoleh,
        badgeBaru,
        feedback: result.feedback || "Kerja bagus, terus belajar ya! 💪",
        koreksi: result.koreksi || "",
      },
    });

    await db.user.update({
      where: { id: student.id },
      data: {
        xp: newXp,
        level: newLevel,
        streakDays,
        lastActive: new Date(),
      },
    });

    return NextResponse.json({
      result: {
        attemptId: attempt.id,
        skor,
        xpDiperoleh,
        badgeBaru,
        badgeEmoji: badgeBaru ? BADGE_META[badgeBaru]?.emoji : null,
        feedback: result.feedback,
        koreksi: result.koreksi || "",
        levelNaik,
        newLevel,
        totalXp: newXp,
        kunci: skor < 60 ? question.kunci : null, // tampilkan kunci jika skor rendah
      },
    });
  } catch (e) {
    console.error("[/api/quiz/submit]", e);
    return NextResponse.json(
      { error: FALLBACK_RESPONSES.api_error, code: "api_error" },
      { status: 500 }
    );
  }
}
