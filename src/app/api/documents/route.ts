import { logger } from "@/lib/logger";
// POST /api/documents — unggah dokumen:
// 1) validasi panjang (maks 20.000 karakter, fallback doc_too_large)
// 2) chunking untuk RAG
// 3) AI Document Processor → metadata struktur (Seksi 4)
// 4) AI Content Moderator → status kelayakan (Seksi 5.1)
// GET /api/documents — daftar dokumen

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chunkDocument, countWords } from "@/lib/rag";
import { ensureChunkEmbeddings } from "@/lib/rag-semantic";
import {
  DOC_PROCESSOR_PROMPT,
  CONTENT_MODERATOR_PROMPT,
  buildDocProcessorUserTurn,
  PARAMS,
} from "@/lib/prompts";
import { chatJSON } from "@/lib/ai";
import { fallbackDocMetadata, fallbackModeration } from "@/lib/doc-fallback";
import { FALLBACK_RESPONSES } from "@/lib/fallback";
import { requireUser } from "@/lib/current-user";
import { guardAi, LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { effectivePlan, PLAN_LIMITS } from "@/lib/plans";
import { documentUploadSchema, readBody } from "@/lib/validation";

export const maxDuration = 60;

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
    const auth = await requireUser();
    if (auth.res) return auth.res;
    const me = auth.user;
    const documents = await db.document.findMany({
      where: me.role === "admin" ? {} : { OR: [{ uploaderId: me.id }, { status: "approved" }] },
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
    logger.error("[/api/documents GET]", { error: e });
    return NextResponse.json({ error: "Gagal memuat dokumen" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;
    const student = auth.user;
    const plan = effectivePlan(student);
    const limited = await guardAi(student.id, plan, student);
    if (limited) return limited;
    const uploadLimit = await rateLimit("upload", student.id, LIMITS.upload.max, LIMITS.upload.windowSec, {
      failClosed: true,
    });
    if (!uploadLimit.ok) return tooManyRequests(uploadLimit);
    const parsed = await readBody(req, documentUploadSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const fileName = parsed.data.fileName || "dokumen-tanpa-nama.txt";
    const content = parsed.data.content;

    if (content.length > PLAN_LIMITS[plan].maxDocChars) {
      return NextResponse.json(
        {
          error: `Dokumen paket ${plan === "premium" ? "Premium" : "Free"} maksimal ${PLAN_LIMITS[plan].maxDocChars.toLocaleString("id-ID")} karakter.`,
          code: "doc_too_large",
        },
        { status: 413 }
      );
    }

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

    // Embedding chunk untuk semantic search (non-fatal: gagal → diisi otomatis saat chat pertama)
    try {
      const saved = await db.chunk.findMany({
        where: { documentId: doc.id },
        select: { id: true, content: true, keywords: true, embedding: true },
      });
      await ensureChunkEmbeddings(saved);
    } catch (e) {
      logger.error("[/api/documents] embedding chunk dilewati:", { error: e });
    }

    // ── AI Document Processor + Content Moderator (paralel agar tidak lambat) ──
    const [metadataResult, moderationResult] = await Promise.allSettled([
      chatJSON<DocMetadata>(
        [
          { role: "system", content: DOC_PROCESSOR_PROMPT },
          { role: "user", content: buildDocProcessorUserTurn(fileName, content) },
        ],
        PARAMS.admin_ops
      ),
      chatJSON<ModerationResult>(
        [
          { role: "system", content: CONTENT_MODERATOR_PROMPT },
          { role: "user", content: `Nama file: ${fileName}\n\n${content}` },
        ],
        PARAMS.admin_ops
      ),
    ]);

    const metadata =
      metadataResult.status === "fulfilled"
        ? metadataResult.value
        : fallbackDocMetadata(fileName, content);
    const moderation =
      moderationResult.status === "fulfilled" ? moderationResult.value : fallbackModeration();
    const aiWarnings: string[] = [];

    if (metadataResult.status === "rejected") {
      logger.error("[doc-processor] ekstraksi gagal:", { error: metadataResult.reason });
      aiWarnings.push("AI struktur tidak tersedia; struktur diekstrak dengan metode lokal.");
    }
    if (moderationResult.status === "rejected") {
      logger.error("[content-moderator] moderasi gagal:", { error: moderationResult.reason });
      aiWarnings.push("AI moderasi tidak tersedia; dokumen menunggu review admin.");
    }

    // Moderation AI hanya boleh menolak otomatis. Persetujuan selalu lewat
    // admin agar konten tak tepercaya tidak bisa mengaktifkan dirinya sendiri.
    let status = "pending";
    if (moderation && (moderation.rekomendasi_admin === "Tolak" || moderation.layak === false)) {
      status = "rejected";
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
        aiWarnings,
        chunkCount: chunks.length,
        createdAt: updated.createdAt,
      },
    });
  } catch (e) {
    logger.error("[/api/documents POST]", { error: e });
    return NextResponse.json(
      { error: FALLBACK_RESPONSES.api_error, code: "api_error" },
      { status: 500 }
    );
  }
}
