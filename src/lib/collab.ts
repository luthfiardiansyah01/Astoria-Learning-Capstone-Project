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

export const TASK_LIST_SELECT = {
  id: true,
  title: true,
  description: true,
  status: true,
  order: true,
  xpReward: true,
  documentId: true,
  dueDate: true,
  assignee: { select: { id: true, name: true } },
} as const;

const TASK_STATUSES = ["todo", "in_progress", "review", "done"] as const;

export async function getProjectWithTasks(
  projectId: string,
  options: { perColumnLimit?: number } = {}
) {
  const perColumn = options.perColumnLimit ?? 50;

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
    },
  });
  if (!project) return null;

  const [counts, ...columns] = await Promise.all([
    db.task.groupBy({
      by: ["status"],
      where: { projectId },
      _count: { _all: true },
    }),
    ...TASK_STATUSES.map((status) =>
      db.task.findMany({
        where: { projectId, status },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        take: perColumn,
        select: TASK_LIST_SELECT,
      })
    ),
  ]);

  const columnCounts = Object.fromEntries(
    TASK_STATUSES.map((status) => [
      status,
      counts.find((row) => row.status === status)?._count._all ?? 0,
    ])
  ) as Record<(typeof TASK_STATUSES)[number], number>;

  return {
    ...project,
    tasks: columns.flat(),
    columnCounts,
    perColumn,
  };
}
