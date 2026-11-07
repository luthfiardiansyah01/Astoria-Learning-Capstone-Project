import { logger } from "@/lib/logger";
// POST /api/quiz/generate — buat 5 soal dari dokumen (basis kuis gamifikasi)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { QUIZ_GENERATOR_PROMPT, PARAMS } from "@/lib/prompts";
import { chatJSON, isAiQuotaError, aiQuotaMessage } from "@/lib/ai";
import { retrieveRelevantChunks } from "@/lib/rag";
import { FALLBACK_RESPONSES } from "@/lib/fallback";
import { requireUser, canUseDocument, forbidden } from "@/lib/current-user";
import { guardAi } from "@/lib/rate-limit";
import { effectivePlan } from "@/lib/plans";
import { quizGenerateSchema, readBody } from "@/lib/validation";

export const maxDuration = 60;

// Generator kuis butuh ruang JSON besar → gunakan param quiz_gen (bukan gamif_eval)
const QUIZ_GEN_PARAMS = PARAMS.quiz_gen;

interface GeneratedQuiz {
  soal: { soal: string; kunci: string; tingkat: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;
    const limited = await guardAi(auth.user.id, effectivePlan(auth.user), auth.user);
    if (limited) return limited;
    const parsed = await readBody(req, quizGenerateSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const documentId = parsed.data.documentId;

    const doc = await db.document.findUnique({
      where: { id: documentId },
      include: { chunks: { orderBy: { chunkIndex: "asc" } } },
    });
    if (!doc) {
      return NextResponse.json({ error: FALLBACK_RESPONSES.no_document }, { status: 404 });
    }

    if (!canUseDocument(auth.user, doc)) return forbidden("Dokumen ini bukan milikmu.");

    // Ambil konten paling representatif (awal + tengah dokumen, maks 6000 karakter)
    const { context } = retrieveRelevantChunks(
      doc.metadata ? JSON.parse(doc.metadata).topik_utama?.join(" ") ?? "" : doc.fileName,
      doc.chunks.map((c) => ({ content: c.content, keywords: c.keywords }))
    );
    const fullContext = doc.content.slice(0, 6000).length >= doc.content.length
      ? doc.content
      : `${doc.content.slice(0, 3000)}\n\n${context}`;

    const quiz = await chatJSON<GeneratedQuiz>(
      [
        { role: "system", content: QUIZ_GENERATOR_PROMPT },
        {
          role: "user",
          content: `Nama file: ${doc.fileName}\nTotal kata: ${doc.wordCount}\n\nKONTEN DOKUMEN:\n${fullContext}`,
        },
      ],
      QUIZ_GEN_PARAMS
    );

    if (!quiz.soal || !Array.isArray(quiz.soal) || quiz.soal.length === 0) {
      throw new Error("Format kuis tidak valid");
    }

    const created = await Promise.all(
      quiz.soal.slice(0, 5).map((q) =>
        db.quizQuestion.create({
          data: {
            documentId: doc.id,
            soal: q.soal,
            kunci: q.kunci,
            tingkat: ["Dasar", "Menengah", "Lanjut"].includes(q.tingkat) ? q.tingkat : "Menengah",
          },
        })
      )
    );

    return NextResponse.json({
      questions: created.map((q) => ({
        id: q.id,
        soal: q.soal,
        tingkat: q.tingkat,
      })),
    });
  } catch (e) {
    logger.error("[/api/quiz/generate]", { error: e });
    if (isAiQuotaError(e)) {
      return NextResponse.json({ error: aiQuotaMessage(), code: "ai_quota" }, { status: 503 });
    }
    return NextResponse.json(
      { error: FALLBACK_RESPONSES.api_error, code: "api_error" },
      { status: 500 }
    );
  }
}
