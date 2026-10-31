// PATCH  /api/collab/tasks/[taskId] — endpoint drag-and-drop Kanban: ubah status/urutan/assignee
// DELETE /api/collab/tasks/[taskId] — hapus tugas

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { assertTeamMember, logActivity, ForbiddenError } from "@/lib/collab";
import { awardTeamXp } from "@/lib/collab-gamif";
import { notifyTeam } from "@/lib/collab-notify";
import { checkTeamBadges } from "@/lib/collab-badges";
import { FALLBACK_RESPONSES } from "@/lib/fallback";
import { readBody, taskUpdateSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

    const { taskId } = await params;
    const task = await db.task.findUnique({ where: { id: taskId }, include: { project: true } });
    if (!task) return NextResponse.json({ error: "Tugas tidak ditemukan." }, { status: 404 });
    await assertTeamMember(user.id, task.project.teamId);

    const parsed = await readBody(req, taskUpdateSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { status, order, assigneeId, title, description, documentId, dueDate } = parsed.data;

    const wasDone = task.status === "done";
    const willBeDone = status === "done";

    const updated = await db.task.update({
      where: { id: taskId },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(order !== undefined ? { order: Number(order) } : {}),
        ...(assigneeId !== undefined ? { assigneeId: assigneeId || null } : {}),
        ...(title?.trim() ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(documentId !== undefined ? { documentId: documentId || null } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      },
      include: { assignee: true },
    });

    let xpAward: Awaited<ReturnType<typeof awardTeamXp>> | null = null;

    if (status !== undefined && status !== task.status) {
      await logActivity({
        teamId: task.project.teamId,
        projectId: task.projectId,
        taskId: task.id,
        userId: user.id,
        type: "task_moved",
        payload: { from: task.status, to: status, title: updated.title },
      });
    }

    if (!wasDone && willBeDone) {
      xpAward = await awardTeamXp(task.project.teamId, task.xpReward);
      await logActivity({
        teamId: task.project.teamId,
        projectId: task.projectId,
        taskId: task.id,
        userId: user.id,
        type: "task_completed",
        payload: { title: updated.title },
      });
      await logActivity({
        teamId: task.project.teamId,
        projectId: task.projectId,
        taskId: task.id,
        userId: user.id,
        type: "xp_awarded",
        payload: { xp: xpAward.xpDiperoleh, newTeamXp: xpAward.newXp, levelNaik: xpAward.levelNaik },
      });
    }

    if (xpAward?.levelNaik) {
      await notifyTeam(task.project.teamId, {
        type: "team_level_up",
        title: `Tim naik ke Level ${xpAward.newLevel}!`,
        body: `Total XP tim: ${xpAward.newXp}`,
        link: `/collab/${task.projectId}`,
        dedupeKey: `level:${task.project.teamId}:${xpAward.newLevel}`,
      });
    }

    const newBadges = !wasDone && willBeDone ? await checkTeamBadges(task.project.teamId, user.id) : [];

    return NextResponse.json({ task: updated, xpAward, newBadges });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("[/api/collab/tasks/[taskId] PATCH]", e);
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

    const { taskId } = await params;
    const task = await db.task.findUnique({ where: { id: taskId }, include: { project: true } });
    if (!task) return NextResponse.json({ error: "Tugas tidak ditemukan." }, { status: 404 });
    await assertTeamMember(user.id, task.project.teamId);

    await db.task.delete({ where: { id: taskId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("[/api/collab/tasks/[taskId] DELETE]", e);
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}
