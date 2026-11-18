// src/lib/collab.ts
// Helper bersama untuk Astoria Collab (tim, proyek, aktivitas)

import { db } from "./db";

export class ForbiddenError extends Error {}

/** Lempar ForbiddenError jika user bukan anggota tim. Kembalikan keanggotaan jika valid. */
export async function assertTeamMember(userId: string, teamId: string) {
  const member = await db.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!member) throw new ForbiddenError("Kamu bukan anggota tim ini.");
  return member;
}

export interface LogActivityInput {
  teamId: string;
  projectId?: string | null;
  taskId?: string | null;
  userId?: string | null;
  type: string;
  payload?: Record<string, unknown> | null;
}

export async function logActivity(input: LogActivityInput) {
  return db.activityEvent.create({
    data: {
      teamId: input.teamId,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      userId: input.userId ?? null,
      type: input.type,
      payload: input.payload ? JSON.stringify(input.payload) : null,
    },
  });
}

export async function getProjectWithTasks(
  projectId: string,
  options: { doneLimit?: number | "all" } = {}
) {
  const doneLimit = options.doneLimit ?? 50;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          members: {
            select: {
              userId: true,
              role: true,
              user: { select: { id: true, name: true } },
            },
          },
        },
      },
      // Tugas aktif selalu dimuat; tugas selesai dibatasi agar payload Kanban
      // tidak membengkak saat proyek berumur panjang.
      tasks: {
        where: { status: { not: "done" } },
        orderBy: [{ status: "asc" }, { order: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          order: true,
          xpReward: true,
          documentId: true,
          dueDate: true,
          assignee: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!project) return null;

  const doneWhere = { projectId, status: "done" };
  const [doneTasks, doneTotal] = await Promise.all([
    db.task.findMany({
      where: doneWhere,
      orderBy: [{ order: "asc" }],
      take: doneLimit === "all" ? undefined : doneLimit,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        order: true,
        xpReward: true,
        documentId: true,
        dueDate: true,
        assignee: { select: { id: true, name: true } },
      },
    }),
    db.task.count({ where: doneWhere }),
  ]);

  return {
    ...project,
    tasks: [...project.tasks, ...doneTasks],
    doneTotal,
    doneLoaded: doneTasks.length,
  };
}
