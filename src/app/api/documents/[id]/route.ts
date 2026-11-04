import { logger } from "@/lib/logger";
// GET /api/documents/[id] — detail dokumen + metadata AI + preview chunks
// DELETE /api/documents/[id] — hapus dokumen (admin / pemilik)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, canUseDocument, canManageDocument, forbidden } from "@/lib/current-user";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;
    const { id } = await params;
    const doc = await db.document.findUnique({
      where: { id },
      include: {
        chunks: { orderBy: { chunkIndex: "asc" } },
        quizQuestions: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
    }

    if (!canUseDocument(auth.user, doc)) return forbidden("Dokumen ini bukan milikmu.");

    return NextResponse.json({
      document: {
        id: doc.id,
        fileName: doc.fileName,
        wordCount: doc.wordCount,
        status: doc.status,
        metadata: doc.metadata ? JSON.parse(doc.metadata) : null,
        moderation: doc.moderation ? JSON.parse(doc.moderation) : null,
        uploaderId: doc.uploaderId,
        createdAt: doc.createdAt,
        chunkCount: doc.chunks.length,
        contentPreview: doc.content.slice(0, 1500),
        quizCount: doc.quizQuestions.length,
      },
    });
  } catch (e) {
    logger.error("[/api/documents/[id] GET]", { error: e });
    return NextResponse.json({ error: "Gagal memuat dokumen" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;
    const { id } = await params;
    const doc = await db.document.findUnique({ where: { id }, select: { uploaderId: true } });
    if (!doc) return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
    if (!canManageDocument(auth.user, doc)) return forbidden("Hanya pemilik atau admin yang bisa menghapus.");
    await db.document.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    logger.error("[/api/documents/[id] DELETE]", { error: e });
    return NextResponse.json({ error: "Gagal menghapus dokumen" }, { status: 500 });
  }
}
