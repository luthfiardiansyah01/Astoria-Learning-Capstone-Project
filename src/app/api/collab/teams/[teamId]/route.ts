import { logger } from "@/lib/logger";
// PATCH  /api/collab/teams/[teamId] — ubah nama tim (owner)
// DELETE /api/collab/teams/[teamId] — hapus tim (owner)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { assertTeamMember, ForbiddenError } from "@/lib/collab";
import { FALLBACK_RESPONSES } from "@/lib/fallback";
import { readBody, teamCreateSchema } from "@/lib/validation";

async function requireOwner(userId: string, teamId: string) {
  const membership = await assertTeamMember(userId, teamId);
  if (membership.role !== "owner") {
    throw new ForbiddenError("Hanya owner tim yang bisa mengubah atau menghapus tim.");
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

    const { teamId } = await params;
    await requireOwner(user.id, teamId);

    const parsed = await readBody(req, teamCreateSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const team = await db.team.update({
      where: { id: teamId },
      data: { name: parsed.data.name.trim() },
      include: { members: { include: { user: { select: { id: true, name: true } } } } },
    });

    return NextResponse.json({ team });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    logger.error("[/api/collab/teams/[teamId] PATCH]", { error: e });
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

    const { teamId } = await params;
    await requireOwner(user.id, teamId);

    await db.team.delete({ where: { id: teamId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    logger.error("[/api/collab/teams/[teamId] DELETE]", { error: e });
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}
