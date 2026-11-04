import { logger } from "@/lib/logger";
// GET /api/collab/users/search?q=&teamId= — saran nama pengguna untuk menambah anggota tim.
// Hanya owner tim; hanya mengembalikan id + nama (tanpa email), tanpa anggota yang sudah ada.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { assertTeamMember, ForbiddenError } from "@/lib/collab";
import { FALLBACK_RESPONSES } from "@/lib/fallback";

const MAX_RESULTS = 8;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

    const teamId = req.nextUrl.searchParams.get("teamId");
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
    if (!teamId) return NextResponse.json({ error: "teamId wajib diisi." }, { status: 400 });

    const requester = await assertTeamMember(user.id, teamId);
    if (requester.role !== "owner") {
      return NextResponse.json({ error: "Hanya owner tim yang bisa mencari anggota." }, { status: 403 });
    }
    if (q.length === 0) return NextResponse.json({ users: [] });

    const existing = await db.teamMember.findMany({ where: { teamId }, select: { userId: true } });
    const existingIds = new Set(existing.map((m) => m.userId));

    // SQLite tidak mendukung `mode: "insensitive"` di Prisma → filter manual.
    const all = await db.user.findMany({ select: { id: true, name: true } });
    const users = all
      .filter((u) => !existingIds.has(u.id) && u.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        return aStarts - bStarts || a.name.localeCompare(b.name);
      })
      .slice(0, MAX_RESULTS);

    return NextResponse.json({ users });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    logger.error("[/api/collab/users/search GET]", { error: e });
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}
