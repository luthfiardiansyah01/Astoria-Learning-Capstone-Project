// src/lib/collab-badges.ts
// Badge tim: dievaluasi deterministik di server (bukan oleh AI), mengikuti pola gamif.ts.

import { db } from "./db";
import { logActivity } from "./collab";
import { notifyTeam } from "./collab-notify";
import { TEAM_BADGE_META } from "./collab-badge-meta";


const DAY_MS = 24 * 60 * 60 * 1000;

/** Hitung badge yang sudah memenuhi syarat tetapi belum dimiliki; simpan, catat aktivitas, dan beri notifikasi. */
export async function checkTeamBadges(teamId: string, actorId?: string): Promise<string[]> {
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: { badges: true, members: { select: { userId: true } } },
  });
  if (!team) return [];

  const owned = new Set(team.badges.map((b) => b.name));
  const since = new Date(Date.now() - 7 * DAY_MS);

  const [doneTasks, aiCount, activeRows] = await Promise.all([
    db.task.findMany({
      where: { status: "done", project: { teamId } },
      select: { id: true, dueDate: true },
    }),
    db.activityEvent.count({ where: { teamId, type: "ai_mentor_used" } }),
    db.activityEvent.groupBy({
      by: ["userId"],
      where: { teamId, createdAt: { gte: since }, userId: { not: null } },
    }),
  ]);

  let onTime = 0;
  const withDue = doneTasks.filter((t) => t.dueDate);
  if (withDue.length > 0) {
    const completions = await db.activityEvent.findMany({
      where: { teamId, type: "task_completed", taskId: { in: withDue.map((t) => t.id) } },
      select: { taskId: true, createdAt: true },
    });
    const completedAt = new Map(completions.map((c) => [c.taskId, c.createdAt]));
    onTime = withDue.filter((t) => {
      const at = completedAt.get(t.id);
      return at && at <= t.dueDate!;
    }).length;
  }

  const activeIds = new Set(activeRows.map((r) => r.userId));
  const eligible: Record<string, boolean> = {
    "Langkah Pertama": doneTasks.length >= 1,
    "Sepuluh Tuntas": doneTasks.length >= 10,
    "Tepat Waktu": onTime >= 3,
    "Tim Solid": team.members.length >= 2 && team.members.every((m) => activeIds.has(m.userId)),
    "Pemburu Level": team.level >= 3,
    "Kolaborator AI": aiCount >= 5,
  };

  const earned: string[] = [];
  for (const [name, ok] of Object.entries(eligible)) {
    if (!ok || owned.has(name)) continue;
    try {
      await db.teamBadge.create({ data: { teamId, name } });
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") continue;
      throw e;
    }
    earned.push(name);
    const meta = TEAM_BADGE_META[name];
    await logActivity({ teamId, userId: actorId ?? null, type: "badge_earned", payload: { badge: name, emoji: meta.emoji } });
    await notifyTeam(teamId, {
      type: "badge_earned",
      title: `Badge tim baru: ${meta.emoji} ${name}`,
      body: meta.desc,
      dedupeKey: `badge:${teamId}:${name}`,
    });
  }
  return earned;
}
