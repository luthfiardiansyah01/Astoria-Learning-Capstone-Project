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

export async function getProjectWithTasks(projectId: string) {
  return db.project.findUnique({
    where: { id: projectId },
    include: {
      team: { include: { members: { include: { user: true } } } },
      tasks: { orderBy: [{ status: "asc" }, { order: "asc" }], include: { assignee: true } },
    },
  });
}
