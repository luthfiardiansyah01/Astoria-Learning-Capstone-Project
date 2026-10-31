// src/lib/collab-notify.ts
// Notifikasi in-app Astoria Collab. dedupeKey mencegah notifikasi ganda untuk kejadian yang sama.

import { db } from "./db";

export interface NotificationInput {
  type: string;
  title: string;
  body?: string;
  link?: string;
  dedupeKey?: string;
}

export async function createNotification(userId: string, input: NotificationInput) {
  try {
    await db.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        dedupeKey: input.dedupeKey ?? null,
      },
    });
  } catch (e) {
    // P2002 = sudah pernah dibuat (dedupeKey sama) → abaikan
    if ((e as { code?: string }).code !== "P2002") throw e;
  }
}

/** Kirim ke seluruh anggota tim (opsional kecuali satu pengguna, mis. pelaku aksi). */
export async function notifyTeam(teamId: string, input: NotificationInput, exceptUserId?: string) {
  const members = await db.teamMember.findMany({ where: { teamId }, select: { userId: true } });
  for (const m of members) {
    if (m.userId === exceptUserId) continue;
    await createNotification(m.userId, {
      ...input,
      dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${m.userId}` : undefined,
    });
  }
}

const DUE_SOON_HOURS = 48;

/**
 * Buat notifikasi tenggat (mendekati/terlambat) untuk tugas belum selesai di tim milik user.
 * Dipanggil saat notifikasi dibuka; idempoten berkat dedupeKey.
 */
export async function scanDeadlines(userId: string) {
  const now = new Date();
  const horizon = new Date(now.getTime() + DUE_SOON_HOURS * 60 * 60 * 1000);
  const tasks = await db.task.findMany({
    where: {
      status: { not: "done" },
      dueDate: { not: null, lte: horizon },
      project: { team: { members: { some: { userId } } } },
    },
    select: { id: true, title: true, dueDate: true, projectId: true, project: { select: { name: true } } },
    take: 50,
  });

  for (const t of tasks) {
    const due = t.dueDate!;
    const day = due.toISOString().slice(0, 10);
    const overdue = due < now;
    await createNotification(userId, {
      type: overdue ? "task_overdue" : "task_due_soon",
      title: overdue ? `Tugas terlambat: ${t.title}` : `Tenggat mendekati: ${t.title}`,
      body: `${t.project.name} · tenggat ${due.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`,
      link: `/collab/${t.projectId}`,
      dedupeKey: `${overdue ? "overdue" : "due-soon"}:${t.id}:${day}`,
    });
  }
}
