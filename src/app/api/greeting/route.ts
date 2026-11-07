import { logger } from "@/lib/logger";
// GET /api/greeting — sapaan mentor proaktif (Seksi 6.3 spesifikasi)
// Data: nama, streak, last active, modul aktif, progress, waktu WIB

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GREETING_PROMPT, buildGreetingUserTurn, PARAMS } from "@/lib/prompts";
import { chatComplete } from "@/lib/ai";
import { formatLastActive, wibNow } from "@/lib/user";
import { requireUser } from "@/lib/current-user";
import { guardAi } from "@/lib/rate-limit";
import { effectivePlan } from "@/lib/plans";

export const maxDuration = 60;

function localGreeting(nama: string, hour: number, streak: number): string {
  let waktu = "Halo";
  if (hour >= 5 && hour < 11) waktu = "Selamat pagi";
  else if (hour >= 11 && hour < 15) waktu = "Selamat siang";
  else if (hour >= 15 && hour < 18) waktu = "Selamat sore";
  else if (hour >= 18 || hour < 5) waktu = "Selamat malam";

  const streakMsg =
    streak >= 3
      ? `Streak ${streak} hari kamu keren, pertahankan ya! 🔥`
      : streak > 1
        ? `Sudah ${streak} hari berturut-turut belajar — lanjutkan!`
        : "Yuk mulai sesi belajar hari ini!";

  return `${waktu}, ${nama.split(" ")[0]}! ${streakMsg}`;
}

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;
    const student = auth.user;
    const limited = await guardAi(student.id, effectivePlan(student), student);
    if (limited) return limited;
    const { clock, label } = wibNow();

    // Modul aktif = dokumen terakhir yang dipakai chat / diunggah
    const [lastDoc, totalQuiz, docCount] = await Promise.all([
      db.document.findFirst({
        where: { OR: [{ uploaderId: student.id }, { status: "approved" }] },
        orderBy: { updatedAt: "desc" },
        select: { fileName: true },
      }),
      db.quizAttempt.count({ where: { userId: student.id } }),
      db.document.count({ where: { uploaderId: student.id } }),
    ]);

    const modulAktif = lastDoc?.fileName ?? "belum ada modul";
    const progressPct = Math.min(100, Math.round((totalQuiz / 15) * 100));

    let greeting: string;
    const fallbackGreeting = localGreeting(
      student.name,
      new Date().getUTCHours() + 7,
      student.streakDays
    );
    const aiGreeting = chatComplete(
      [
        { role: "system", content: GREETING_PROMPT },
        {
          role: "user",
          content: buildGreetingUserTurn({
            nama: student.name,
            streak: student.streakDays,
            lastActive: formatLastActive(student.lastActive),
            modulAktif,
            progressPct,
            jamSaatIni: clock,
          }),
        },
      ],
      PARAMS.gamif_eval,
      { timeoutMs: 1500, retries: 1 }
    )
      .then((value) => value.replace(/^(sapaan|greeting)\s*:\s*/i, "").trim())
      .catch((e) => {
        logger.error("[/api/greeting] AI gagal, pakai sapaan lokal:", { error: e });
        return fallbackGreeting;
      });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<string>((_, reject) => {
      timer = setTimeout(() => reject(new Error("greeting timeout")), 1500);
    });

    try {
      greeting = await Promise.race([aiGreeting, deadline]);
    } catch {
      greeting = fallbackGreeting;
    } finally {
      if (timer) clearTimeout(timer);
    }

    return NextResponse.json({
      greeting,
      waktu: label,
      stats: {
        nama: student.name,
        xp: student.xp,
        level: student.level,
        streak: student.streakDays,
        totalQuiz,
        docCount,
        modulAktif,
        progressPct,
      },
    });
  } catch (e) {
    logger.error("[/api/greeting]", { error: e });
    return NextResponse.json({ error: "Gagal memuat sapaan" }, { status: 500 });
  }
}
