import { logger } from "@/lib/logger";
// GET /api/admin/audit - 100 aksi admin terakhir.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.res) return auth.res;

    const limitParam = Number(req.nextUrl.searchParams.get("limit"));
    const take = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(200, Math.floor(limitParam)) : 100;

    const logs = await db.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        detail: true,
        createdAt: true,
        admin: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({ logs });
  } catch (e) {
    logger.error("[/api/admin/audit GET]", { error: e });
    return NextResponse.json({ error: "Gagal memuat audit log." }, { status: 500 });
  }
}
