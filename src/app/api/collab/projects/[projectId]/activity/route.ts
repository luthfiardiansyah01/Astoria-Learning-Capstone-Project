import { logger } from "@/lib/logger";
// GET /api/collab/projects/[projectId]/activity — activity feed proyek (paginasi sederhana)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { assertTeamMember, ForbiddenError } from "@/lib/collab";
import { FALLBACK_RESPONSES } from "@/lib/fallback";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

    const { projectId } = await params;
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Proyek tidak ditemukan." }, { status: 404 });
    await assertTeamMember(user.id, project.teamId);

    const take = Math.min(Number(req.nextUrl.searchParams.get("take")) || 30, 100);

    const events = await db.activityEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        user: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    });

    const activity = events.map((e) => ({
      ...e,
      payload: e.payload ? JSON.parse(e.payload) : null,
    }));

    return NextResponse.json({ activity });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    logger.error("[/api/collab/projects/[projectId]/activity GET]", { error: e });
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}
