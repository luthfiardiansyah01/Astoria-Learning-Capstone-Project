// POST /api/admin/decision — keputusan admin: aktifkan / review / tolak dokumen

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { documentId, decision } = await req.json();
    if (!documentId || !["approved", "pending", "rejected"].includes(decision)) {
      return NextResponse.json({ error: "Keputusan tidak valid" }, { status: 400 });
    }

    const doc = await db.document.update({
      where: { id: documentId },
      data: { status: decision },
    });

    return NextResponse.json({
      document: { id: doc.id, fileName: doc.fileName, status: doc.status },
    });
  } catch (e) {
    console.error("[/api/admin/decision]", e);
    return NextResponse.json({ error: "Gagal memproses keputusan admin" }, { status: 500 });
  }
}
