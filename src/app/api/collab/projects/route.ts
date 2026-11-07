import { logger } from "@/lib/logger";
// POST /api/collab/projects — buat proyek baru di bawah sebuah tim

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { assertTeamMember, ForbiddenError } from "@/lib/collab";
import { FALLBACK_RESPONSES } from "@/lib/fallback";
import { projectCreateSchema, readBody } from "@/lib/validation";
import { PLAN_LIMITS } from "@/lib/plans";
import { teamOwnerPlan } from "@/lib/team-plan";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

    const parsed = await readBody(req, projectCreateSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { teamId, name, description } = parsed.data;
    await assertTeamMember(user.id, teamId);

    const plan = await teamOwnerPlan(teamId, user);
    const maxProjects = PLAN_LIMITS[plan].maxProjectsPerTeam;

    // Kunci baris tim agar batas proyek tidak bisa dilewati request paralel.
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Team" WHERE id = ${teamId} FOR UPDATE`;
      const projectCount = await tx.project.count({ where: { teamId } });
      if (projectCount >= maxProjects) return { created: false as const };
      const project = await tx.project.create({
        data: { teamId, name: name.trim(), description: description?.trim() || null },
      });
      return { created: true as const, project };
    });

    if (!result.created) {
      return NextResponse.json(
        {
          error: `Batas paket tim (${plan === "premium" ? "Premium" : "Free"}): maksimal ${maxProjects} proyek per tim. Upgrade paket owner untuk menambah proyek.`,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ project: result.project });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    logger.error("[/api/collab/projects POST]", { error: e });
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}
