import { logger } from "@/lib/logger";
// GET /api/collab/teams/leaderboard — peringkat tim berdasarkan XP kolektif

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { FALLBACK_RESPONSES } from "@/lib/fallback";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

    const teams = await db.team.findMany({
      orderBy: [{ xp: "desc" }],
      include: { members: { select: { userId: true } }, badges: { select: { name: true } } },
      take: 50,
    });

    const leaderboard = teams.map((t, i) => ({
      rank: i + 1,
      id: t.id,
      name: t.name,
      xp: t.xp,
      level: t.level,
      memberCount: t.members.length,
      badges: t.badges.map((b) => b.name),
    }));

    return NextResponse.json({ leaderboard });
  } catch (e) {
    logger.error("[/api/collab/teams/leaderboard GET]", { error: e });
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}
