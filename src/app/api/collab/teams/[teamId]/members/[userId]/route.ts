// DELETE /api/collab/teams/[teamId]/members/[userId] — keluarkan anggota

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { assertTeamMember, ForbiddenError } from "@/lib/collab";
import { FALLBACK_RESPONSES } from "@/lib/fallback";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ teamId: string; userId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

    const { teamId, userId } = await params;
    const requester = await assertTeamMember(user.id, teamId);

    if (requester.role !== "owner" && user.id !== userId) {
      return NextResponse.json(
        { error: "Hanya owner tim yang bisa mengeluarkan anggota lain." },
        { status: 403 }
      );
    }

    const target = await db.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
    if (target?.role === "owner") {
      return NextResponse.json({ error: "Owner tim tidak bisa dikeluarkan." }, { status: 400 });
    }

    await db.teamMember.deleteMany({ where: { teamId, userId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("[/api/collab/teams/[teamId]/members/[userId] DELETE]", e);
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}
