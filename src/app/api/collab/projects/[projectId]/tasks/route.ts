import { logger } from "@/lib/logger";
// POST /api/collab/projects/[projectId]/tasks — buat tugas baru di kolom "todo"

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { assertTeamMember, logActivity, ForbiddenError } from "@/lib/collab";
import { FALLBACK_RESPONSES } from "@/lib/fallback";
import { readBody, taskCreateSchema } from "@/lib/validation";
import { PLAN_LIMITS } from "@/lib/plans";
import { teamOwnerPlan } from "@/lib/team-plan";

export async function POST(
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

    const parsed = await readBody(req, taskCreateSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { title, description, assigneeId, xpReward } = parsed.data;

    if (assigneeId) {
      const assignee = await db.teamMember.findUnique({
        where: { teamId_userId: { teamId: project.teamId, userId: assigneeId } },
        select: { userId: true },
      });
      if (!assignee) {
        return NextResponse.json(
          { error: "Penerima tugas harus anggota tim ini." },
          { status: 400 }
        );
      }
    }

    const plan = await teamOwnerPlan(project.teamId, user);
    const maxTasks = PLAN_LIMITS[plan].maxTasksPerProject;

    // Kunci baris proyek: cek batas dan penentuan urutan dilakukan atomik.
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${projectId} FOR UPDATE`;
      const taskCount = await tx.task.count({ where: { projectId } });
      if (taskCount >= maxTasks) return { created: false as const };
      const lastInColumn = await tx.task.findFirst({
        where: { projectId, status: "todo" },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      const task = await tx.task.create({
        data: {
          projectId,
          title: title.trim(),
          description: description?.trim() || null,
          assigneeId: assigneeId || null,
          xpReward: xpReward ?? 10,
          order: (lastInColumn?.order ?? -1) + 1,
        },
        include: { assignee: { select: { id: true, name: true } } },
      });
      return { created: true as const, task };
    });

    if (!result.created) {
      return NextResponse.json(
        {
          error: `Batas paket tim (${plan === "premium" ? "Premium" : "Free"}): maksimal ${maxTasks} tugas per proyek. Upgrade paket owner untuk menambah tugas.`,
        },
        { status: 403 }
      );
    }

    const task = result.task;

    await logActivity({
      teamId: project.teamId,
      projectId,
      taskId: task.id,
      userId: user.id,
      type: "task_created",
      payload: { title: task.title },
    });

    return NextResponse.json({ task });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    logger.error("[/api/collab/projects/[projectId]/tasks POST]", { error: e });
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}
