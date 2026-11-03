// POST /api/collab/projects/[projectId]/tasks — buat tugas baru di kolom "todo"

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { assertTeamMember, logActivity, ForbiddenError } from "@/lib/collab";
import { FALLBACK_RESPONSES } from "@/lib/fallback";
import { readBody, taskCreateSchema } from "@/lib/validation";
import { effectivePlan, PLAN_LIMITS } from "@/lib/plans";

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

    const plan = effectivePlan(user);
    const taskCount = await db.task.count({ where: { projectId } });
    const maxTasks = PLAN_LIMITS[plan].maxTasksPerProject;
    if (taskCount >= maxTasks) {
      return NextResponse.json(
        {
          error: `Batas paket ${plan === "premium" ? "Premium" : "Free"}: maksimal ${maxTasks} tugas per proyek. Upgrade untuk menambah tugas.`,
        },
        { status: 403 }
      );
    }

    const parsed = await readBody(req, taskCreateSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { title, description, assigneeId, xpReward } = parsed.data;

    const lastInColumn = await db.task.findFirst({
      where: { projectId, status: "todo" },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const task = await db.task.create({
      data: {
        projectId,
        title: title.trim(),
        description: description?.trim() || null,
        assigneeId: assigneeId || null,
        xpReward: xpReward ?? 10,
        order: (lastInColumn?.order ?? -1) + 1,
      },
      include: { assignee: true },
    });

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
    console.error("[/api/collab/projects/[projectId]/tasks POST]", e);
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}
