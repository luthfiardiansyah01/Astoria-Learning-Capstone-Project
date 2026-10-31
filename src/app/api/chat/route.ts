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
import { retrieveForDocument } from "@/lib/rag-semantic";
import { chatComplete, type ChatMessageForAI } from "@/lib/ai";
import { FALLBACK_RESPONSES, isOutOfContext, preprocessUserInput } from "@/lib/fallback";
import { requireUser, canUseDocument, forbidden } from "@/lib/current-user";
import { guardAi } from "@/lib/rate-limit";
import { chatSchema, readBody } from "@/lib/validation";

// Model gratis bisa lambat; 60 dtk adalah batas aman paket Hobby Vercel.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;
    const documentId = req.nextUrl.searchParams.get("documentId");
    const messages = await db.chatMessage.findMany({
      where: { documentId: documentId ?? null, userId: auth.user.id },
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
    const auth = await requireUser();
    if (auth.res) return auth.res;
    const documentId = req.nextUrl.searchParams.get("documentId");
    await db.chatMessage.deleteMany({ where: { documentId: documentId ?? null, userId: auth.user.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[/api/chat DELETE]", e);
    return NextResponse.json({ error: "Gagal menghapus riwayat" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;
    const user = auth.user;
    const limited = await guardAi(user.id);
    if (limited) return limited;
    const parsed = await readBody(req, chatSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const documentId: string | null = parsed.data.documentId ?? null;
    let question: string;
    try {
      question = preprocessUserInput(parsed.data.question);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }


    // ── 1. Validasi dokumen (fallback: no_document) ──
    if (!documentId) {
      return NextResponse.json(
        { reply: FALLBACK_RESPONSES.no_document, fallback: "no_document" },
        { status: 200 }
      );
    }

    const doc = await db.document.findUnique({ where: { id: documentId } });
    if (!doc) {
      return NextResponse.json(
        { reply: FALLBACK_RESPONSES.no_document, fallback: "no_document" },
        { status: 200 }
      );
    }
    if (!canUseDocument(user, doc)) return forbidden("Dokumen ini bukan milikmu.");

    // ── 2. Retrieval RAG ──
    const { context, isPartial } = await retrieveForDocument(documentId, question);

    // ── 3. Susun payload: system + history (maks 6) + pertanyaan ──
    const systemPrompt = [
      MENTOR_SYSTEM_PROMPT,
      buildRagContext({
        namaFile: doc.fileName,
        namaMahasiswa: user.name,
        wordCount: doc.wordCount,
        chunkContent: context,
        isPartial,
      }),
    ].join("\n\n");

    const history = await db.chatMessage.findMany({
      where: { documentId, userId: user.id },
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
      reply = await chatComplete(messages, PARAMS.user_mentor, { cache: true });
    } catch (e) {
      console.error("[/api/chat] AI gagal:", e);
      await db.chatMessage.createMany({
        data: [
          { userId: user.id, documentId, role: "user", content: question },
          { userId: user.id, documentId, role: "assistant", content: FALLBACK_RESPONSES.api_error },
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
        { userId: user.id, documentId, role: "user", content: question },
        { userId: user.id, documentId, role: "assistant", content: reply },
      ],
    });

    await db.user.update({
      where: { id: user.id },
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
