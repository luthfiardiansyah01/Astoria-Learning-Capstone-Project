import { logger } from "@/lib/logger";
// GET /api/collab/invites — daftar undangan tim yang masih pending untuk pengguna.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { FALLBACK_RESPONSES } from "@/lib/fallback";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

    const invites = await db.teamInvite.findMany({
      where: { userId: user.id, status: "pending" },
      orderBy: { createdAt: "desc" },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            _count: { select: { members: true } },
          },
        },
        invitedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ invites });
  } catch (e) {
    logger.error("[/api/collab/invites GET]", { error: e });
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}
