import { logger } from "@/lib/logger";
// GET /api/collab/analytics — dashboard analitik tim.
// Admin/dosen: semua tim. Mahasiswa: hanya tim yang diikuti.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { FALLBACK_RESPONSES } from "@/lib/fallback";
import { wibDayKey } from "@/lib/rate-limit";

const DAY_MS = 24 * 60 * 60 * 1000;
const TREND_DAYS = 14;

function dayKey(d: Date) {
  return wibDayKey(d);
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

    const isAdmin = user.role === "admin";
    const teams = await db.team.findMany({
      where: isAdmin ? {} : { members: { some: { userId: user.id } } },
      include: {
        members: { include: { user: { select: { id: true, name: true } } } },
        projects: {
          include: { tasks: { include: { assignee: { select: { id: true, name: true } } } } },
        },
        activities: { select: { type: true, userId: true, taskId: true, createdAt: true } },
        badges: { select: { name: true } },
      },
      orderBy: { xp: "desc" },
    });

    const now = new Date();
    // Mulai dari tengah malam WIB, bukan tengah malam zona server (Vercel = UTC).
    const todayStartMs = Date.parse(`${wibDayKey(now)}T00:00:00+07:00`);
    const sinceMs = todayStartMs - (TREND_DAYS - 1) * DAY_MS;

    const result = teams.map((team) => {
      const tasks = team.projects.flatMap((p) => p.tasks.map((t) => ({ ...t, projectName: p.name })));
      const doneTasks = tasks.filter((t) => t.status === "done");
      const completions = team.activities.filter((a) => a.type === "task_completed");
      const completedAt = new Map(completions.map((c) => [c.taskId, c.createdAt]));
      const completedBy = new Map(completions.map((c) => [c.taskId, c.userId]));

      const isLate = (t: (typeof tasks)[number]) => {
        if (!t.dueDate) return false;
        if (t.status === "done") {
          const at = completedAt.get(t.id);
          return at ? at > t.dueDate : false;
        }
        return t.dueDate < now;
      };

      const overdue = tasks
        .filter((t) => t.status !== "done" && t.dueDate && t.dueDate < now)
        .map((t) => ({
          id: t.id,
          title: t.title,
          project: t.projectName,
          dueDate: t.dueDate,
          assignee: t.assignee?.name ?? null,
          daysLate: Math.ceil((now.getTime() - t.dueDate!.getTime()) / DAY_MS),
        }))
        .sort((a, b) => b.daysLate - a.daysLate);

      const members = team.members.map((m) => {
        const doneByMember = doneTasks.filter((t) => (completedBy.get(t.id) ?? t.assigneeId) === m.userId);
        const assigned = tasks.filter((t) => t.assigneeId === m.userId);
        const acts = team.activities.filter((a) => a.userId === m.userId);
        const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
        return {
          userId: m.userId,
          name: m.user.name,
          role: m.role,
          assigned: assigned.length,
          completed: doneByMember.length,
          completedOnTime: doneByMember.filter((t) => !isLate(t)).length,
          xpContributed: doneByMember.reduce((sum, t) => sum + t.xpReward, 0),
          aiQuestions: acts.filter((a) => a.type === "ai_mentor_used").length,
          activeLast7Days: acts.filter((a) => a.createdAt >= weekAgo).length,
        };
      });

      const totalContribution = members.reduce((s, m) => s + m.completed, 0);
      const trend: Record<string, number> = {};
      for (let i = 0; i < TREND_DAYS; i++) trend[dayKey(new Date(sinceMs + i * DAY_MS))] = 0;
      for (const a of team.activities) {
        const k = dayKey(a.createdAt);
        if (k in trend) trend[k]++;
      }

      return {
        id: team.id,
        name: team.name,
        xp: team.xp,
        level: team.level,
        badges: team.badges.map((b) => b.name),
        summary: {
          totalTasks: tasks.length,
          byStatus: {
            todo: tasks.filter((t) => t.status === "todo").length,
            in_progress: tasks.filter((t) => t.status === "in_progress").length,
            review: tasks.filter((t) => t.status === "review").length,
            done: doneTasks.length,
          },
          completionRate: tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0,
          overdueCount: overdue.length,
          lateCompletedCount: doneTasks.filter(isLate).length,
          activeMembers7d: members.filter((m) => m.activeLast7Days > 0).length,
          memberCount: members.length,
        },
        members: members.map((m) => ({
          ...m,
          contributionPct: totalContribution ? Math.round((m.completed / totalContribution) * 100) : 0,
        })),
        overdue,
        trend: Object.entries(trend).map(([date, count]) => ({ date, count })),
      };
    });

    return NextResponse.json({ scope: isAdmin ? "admin" : "member", teams: result });
  } catch (e) {
    logger.error("[/api/collab/analytics GET]", { error: e });
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}
