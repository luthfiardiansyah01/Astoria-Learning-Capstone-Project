import { logger } from "@/lib/logger";
// GET /api/admin/system - status fitur infrastruktur (khusus admin).
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { pgvectorAvailable } from "@/lib/pgvector";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.res) return auth.res;

    return NextResponse.json({
      pgvector: await pgvectorAvailable(),
      embedModel: process.env.AI_EMBED_MODEL ?? null,
      nodeEnv: process.env.NODE_ENV ?? null,
    });
  } catch (e) {
    logger.error("[/api/admin/system GET]", { error: e });
    return NextResponse.json({ error: "Gagal memuat status sistem." }, { status: 500 });
  }
}
