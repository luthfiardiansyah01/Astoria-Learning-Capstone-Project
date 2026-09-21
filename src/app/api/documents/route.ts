// POST /api/documents — unggah dokumen:
// 1) validasi panjang (maks 50.000 karakter, fallback doc_too_large)
// 2) chunking untuk RAG
// 3) AI Document Processor → metadata struktur (Seksi 4)
// 4) AI Content Moderator → status kelayakan (Seksi 5.1)
// GET /api/documents — daftar dokumen

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chunkDocument, countWords, MAX_DOC_LENGTH } from "@/lib/rag";
import {
  DOC_PROCESSOR_PROMPT,
  CONTENT_MODERATOR_PROMPT,
  buildDocProcessorUserTurn,
  PARAMS,
} from "@/lib/prompts";
import { chatJSON } from "@/lib/ai";
import { FALLBACK_RESPONSES } from "@/lib/fallback";
import { getOrCreateUsers } from "@/lib/user";

interface DocMetadata {
  judul_dokumen: string;
  ringkasan: string;
  topik_utama: string[];
  struktur: { bab: string; judul: string; subtopik: string[] }[];
  kata_kunci: string[];
  estimasi_tingkat_kesulitan: string;
  mata_kuliah_terkait: string;
}

interface ModerationResult {
  layak: boolean;
  skor_kualitas: number;
  alasan: string;
  tag_otomatis: string[];
  rekomendasi_admin: string;
}

export async function GET() {
  try {
    const documents = await db.document.findMany({
      orderBy: { createdAt: "desc" },
      include: { uploader: { select: { name: true } } },
    });

    return NextResponse.json({
      documents: documents.map((d) => ({
        id: d.id,
        fileName: d.fileName,
        wordCount: d.wordCount,
        status: d.status,
        metadata: d.metadata ? JSON.parse(d.metadata) : null,
        moderation: d.moderation ? JSON.parse(d.moderation) : null,
        uploader: d.uploader.name,
        createdAt: d.createdAt,
      })),
    });
  } catch (e) {
    console.error("[/api/documents GET]", e);
    return NextResponse.json({ error: "Gagal memuat dokumen" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fileName: string = (body.fileName ?? "").toString().trim() || "dokumen-tanpa-nama.txt";
    const content: string = (body.content ?? "").toString().trim();

    if (!content) {
      return NextResponse.json(
        { error: "Konten dokumen kosong. Tempel teks modul kamu dulu ya!" },
        { status: 400 }
      );
    }

    if (content.length > MAX_DOC_LENGTH) {
      return NextResponse.json(
        { error: FALLBACK_RESPONSES.doc_too_large, code: "doc_too_large" },
        { status: 413 }
      );
    }

    const { student } = await getOrCreateUsers();
    const wordCount = countWords(content);

    // Simpan dokumen + chunks RAG
    const doc = await db.document.create({
      data: {
        fileName,
        content,
        wordCount,
        uploaderId: student.id,
        status: "pending",
      },
    });

    const chunks = chunkDocument(content);
    await db.chunk.createMany({
      data: chunks.map((c, i) => ({
        documentId: doc.id,
        content: c.content,
        chunkIndex: i,
        keywords: c.keywords,
      })),
    });

    // ── AI Document Processor: ekstraksi struktur (Seksi 4) ──
    let metadata: DocMetadata | null = null;
    try {
      metadata = await chatJSON<DocMetadata>(
        [
          { role: "system", content: DOC_PROCESSOR_PROMPT },
          { role: "user", content: buildDocProcessorUserTurn(fileName, content) },
        ],
        PARAMS.admin_ops
      );
    } catch (e) {
      console.error("[doc-processor] ekstraksi gagal:", e);
    }

    // ── AI Content Moderator: moderasi kelayakan (Seksi 5.1) ──
    let moderation: ModerationResult | null = null;
    try {
      moderation = await chatJSON<ModerationResult>(
        [
          {
            role: "system",
            content: CONTENT_MODERATOR_PROMPT,
          },
          {
            role: "user",
            content: `Nama file: ${fileName}\n\n${content.slice(0, 2000)}`,
          },
        ],
        PARAMS.admin_ops
      );
    } catch (e) {
      console.error("[content-moderator] moderasi gagal:", e);
    }

    // Status awal dari rekomendasi AI moderator
    let status = "pending";
    if (moderation) {
      if (moderation.rekomendasi_admin === "Aktifkan langsung" && moderation.layak) {
        status = "approved";
      } else if (moderation.rekomendasi_admin === "Tolak" || moderation.layak === false) {
        status = "rejected";
      }
    }

    const updated = await db.document.update({
      where: { id: doc.id },
      data: {
        metadata: metadata ? JSON.stringify(metadata) : null,
        moderation: moderation ? JSON.stringify(moderation) : null,
        status,
      },
    });

    return NextResponse.json({
      document: {
        id: updated.id,
        fileName: updated.fileName,
        wordCount: updated.wordCount,
        status: updated.status,
        metadata,
        moderation,
        chunkCount: chunks.length,
        createdAt: updated.createdAt,
      },
    });
  } catch (e) {
    console.error("[/api/documents POST]", e);
    return NextResponse.json(
      { error: FALLBACK_RESPONSES.api_error, code: "api_error" },
      { status: 500 }
    );
  }
}
