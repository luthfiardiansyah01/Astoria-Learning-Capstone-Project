import { logger } from "@/lib/logger";
// POST /api/admin/decision — keputusan admin: aktifkan / review / tolak dokumen

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/current-user";
import { adminDecisionSchema, readBody } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.res) return auth.res;
    const parsed = await readBody(req, adminDecisionSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { documentId, decision } = parsed.data;

    const doc = await db.document.update({
      where: { id: documentId },
      data: { status: decision },
    });

    return NextResponse.json({
      document: { id: doc.id, fileName: doc.fileName, status: doc.status },
    });
  } catch (e) {
    logger.error("[/api/admin/decision]", { error: e });
    return NextResponse.json({ error: "Gagal memproses keputusan admin" }, { status: 500 });
  }
}
