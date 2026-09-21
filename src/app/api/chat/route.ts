// POST /api/chat — Mentor AI RAG Chat (Seksi 3 spesifikasi):
//   1. Mahasiswa pilih dokumen → retrieval chunk paling relevan
//   2. System prompt = PLATFORM_IDENTITY + MENTOR_PROMPT + RAG_CONTEXT_INJECTION
//   3. Riwayat chat maks 6 pesan terakhir + pertanyaan terbaru
//   4. Deteksi out-of-context → fallback ramah
// GET /api/chat?documentId= — riwayat chat
// DELETE /api/chat?documentId= — bersihkan riwayat

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MENTOR_SYSTEM_PROMPT, buildRagContext, PARAMS } from "@/lib/prompts";
import { retrieveRelevantChunks } from "@/lib/rag";
import { chatComplete, type ChatMessageForAI } from "@/lib/ai";
import { FALLBACK_RESPONSES, isOutOfContext, preprocessUserInput } from "@/lib/fallback";
import { getOrCreateUsers } from "@/lib/user";

export async function GET(req: NextRequest) {
  try {
    const documentId = req.nextUrl.searchParams.get("documentId");
    const messages = await db.chatMessage.findMany({
      where: { documentId: documentId ?? null },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    return NextResponse.json({ messages });
  } catch (e) {
    console.error("[/api/chat GET]", e);
    return NextResponse.json({ error: "Gagal memuat riwayat chat" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const documentId = req.nextUrl.searchParams.get("documentId");
    await db.chatMessage.deleteMany({ where: { documentId: documentId ?? null } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[/api/chat DELETE]", e);
    return NextResponse.json({ error: "Gagal menghapus riwayat" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const documentId: string | null = body.documentId ?? null;
    let question: string;
    try {
      question = preprocessUserInput((body.question ?? "").toString());
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }

    const { student } = await getOrCreateUsers();

    // ── 1. Validasi dokumen (fallback: no_document) ──
    if (!documentId) {
      return NextResponse.json(
        { reply: FALLBACK_RESPONSES.no_document, fallback: "no_document" },
        { status: 200 }
      );
    }

    const doc = await db.document.findUnique({
      where: { id: documentId },
      include: { chunks: { orderBy: { chunkIndex: "asc" } } },
    });
    if (!doc) {
      return NextResponse.json(
        { reply: FALLBACK_RESPONSES.no_document, fallback: "no_document" },
        { status: 200 }
      );
    }

    // ── 2. Retrieval RAG ──
    const { context, isPartial } = retrieveRelevantChunks(
      question,
      doc.chunks.map((c) => ({ content: c.content, keywords: c.keywords }))
    );

    // ── 3. Susun payload: system + history (maks 6) + pertanyaan ──
    const systemPrompt = [
      MENTOR_SYSTEM_PROMPT,
      buildRagContext({
        namaFile: doc.fileName,
        namaMahasiswa: student.name,
        wordCount: doc.wordCount,
        chunkContent: context,
        isPartial,
      }),
    ].join("\n\n");

    const history = await db.chatMessage.findMany({
      where: { documentId, userId: student.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
    const historyMessages: ChatMessageForAI[] = history
      .reverse()
      .map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      }));

    const messages: ChatMessageForAI[] = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: question },
    ];

    // ── 4. Panggil AI (fallback: api_error) ──
    let reply: string;
    try {
      reply = await chatComplete(messages, PARAMS.user_mentor);
    } catch (e) {
      console.error("[/api/chat] AI gagal:", e);
      await db.chatMessage.createMany({
        data: [
          { userId: student.id, documentId, role: "user", content: question },
          { userId: student.id, documentId, role: "assistant", content: FALLBACK_RESPONSES.api_error },
        ],
      });
      return NextResponse.json({ reply: FALLBACK_RESPONSES.api_error, fallback: "api_error" });
    }

    // ── 5. Deteksi out-of-context (Seksi 7) ──
    if (isOutOfContext(reply)) {
      reply = FALLBACK_RESPONSES.out_of_context;
    }

    // ── 6. Simpan riwayat ──
    await db.chatMessage.createMany({
      data: [
        { userId: student.id, documentId, role: "user", content: question },
        { userId: student.id, documentId, role: "assistant", content: reply },
      ],
    });

    await db.user.update({
      where: { id: student.id },
      data: { lastActive: new Date() },
    });

    return NextResponse.json({ reply });
  } catch (e) {
    console.error("[/api/chat POST]", e);
    return NextResponse.json(
      { reply: FALLBACK_RESPONSES.api_error, fallback: "api_error" },
      { status: 500 }
    );
  }
}
