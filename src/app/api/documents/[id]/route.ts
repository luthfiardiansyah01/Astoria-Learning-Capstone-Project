// GET /api/documents/[id] — detail dokumen + metadata AI + preview chunks
// DELETE /api/documents/[id] — hapus dokumen (admin / pemilik)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    console.error("[/api/documents/[id] GET]", e);
    return NextResponse.json({ error: "Gagal memuat dokumen" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.document.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[/api/documents/[id] DELETE]", e);
    return NextResponse.json({ error: "Gagal menghapus dokumen" }, { status: 500 });
  }
}
