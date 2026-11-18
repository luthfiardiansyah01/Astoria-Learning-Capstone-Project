import { logger } from "@/lib/logger";
// GET /api/collab/analytics — dashboard analitik tim.
// Admin/dosen: semua tim. Mahasiswa: hanya tim yang diikuti.

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { FALLBACK_RESPONSES } from "@/lib/fallback";
import { wibDayKey } from "@/lib/rate-limit";

const DAY_MS = 24 * 60 * 60 * 1000;
const TREND_DAYS = 14;
const CACHE_TTL_MS = 30_000;
const CACHE_MAX = 200;

// Dashboard analitik boleh tertinggal ≤30 detik. Cache per pengguna mengurangi
// beban DB saat panel dibuka berulang/refresh.
const responseCache = new Map<string, { expires: number; payload: unknown }>();

function dayKey(d: Date) {
  return wibDayKey(d);
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

    const isAdmin = user.role === "admin";
    const cacheKey = `${isAdmin ? "admin" : "member"}:${user.id}`;
    if (process.env.NODE_ENV === "production") {
      const cached = responseCache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return NextResponse.json(cached.payload, {
          headers: { "Cache-Control": "private, max-age=30" },
        });
      }
      // Cache persisten antar-instance (serverless).
      const persisted = await db.analyticsCache.findUnique({ where: { key: cacheKey } });
      if (persisted && Date.now() - persisted.updatedAt.getTime() < CACHE_TTL_MS) {
        return NextResponse.json(persisted.payload, {
          headers: { "Cache-Control": "private, max-age=30" },
        });
      }
    }

    const now = new Date();
    // Mulai dari tengah malam WIB, bukan tengah malam zona server (Vercel = UTC).
    const todayStartMs = Date.parse(`${wibDayKey(now)}T00:00:00+07:00`);
    const sinceMs = todayStartMs - (TREND_DAYS - 1) * DAY_MS;
    const since = new Date(sinceMs);
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

    const [teams, aiCounts, activeCounts, trendRows] = await Promise.all([
      db.team.findMany({
        where: isAdmin ? {} : { members: { some: { userId: user.id } } },
        include: {
          members: { include: { user: { select: { id: true, name: true } } } },
          projects: {
            include: { tasks: { include: { assignee: { select: { id: true, name: true } } } } },
          },
          // Hanya kejadian penyelesaian tugas yang dibutuhkan untuk hitungan
          // "selesai tepat waktu"; aktivitas lain diagregasi di database.
          activities: {
            where: { type: "task_completed" },
            select: { taskId: true, userId: true, createdAt: true },
          },
          badges: { select: { name: true } },
        },
        orderBy: { xp: "desc" },
      }),
      db.activityEvent.groupBy({
        by: ["teamId", "userId"],
        where: { type: "ai_mentor_used" },
        _count: { _all: true },
      }),
      db.activityEvent.groupBy({
        by: ["teamId", "userId"],
        where: { createdAt: { gte: weekAgo } },
        _count: { _all: true },
      }),
      // Tren 14 hari dihitung di SQL memakai tanggal WIB.
      db.$queryRaw<Array<{ teamId: string; day: string; total: number }>>`
        SELECT "teamId",
               to_char("createdAt" + interval '7 hours', 'YYYY-MM-DD') AS day,
               count(*)::int AS total
        FROM "ActivityEvent"
        WHERE "createdAt" >= ${since}
        GROUP BY 1, 2
      `,
    ]);

    const statKey = (teamId: string, userId: string | null) => `${teamId}:${userId ?? ""}`;
    const aiMap = new Map(aiCounts.map((row) => [statKey(row.teamId, row.userId), row._count._all]));
    const activeMap = new Map(
      activeCounts.map((row) => [statKey(row.teamId, row.userId), row._count._all])
    );
    const trendByTeam = new Map<string, Map<string, number>>();
    for (const row of trendRows) {
      const days = trendByTeam.get(row.teamId) ?? new Map<string, number>();
      days.set(row.day, row.total);
      trendByTeam.set(row.teamId, days);
    }

    const result = teams.map((team) => {
      const tasks = team.projects.flatMap((p) => p.tasks.map((t) => ({ ...t, projectName: p.name })));
      const doneTasks = tasks.filter((t) => t.status === "done");
      const completions = team.activities;
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
        const doneByMember = doneTasks.filter(
          (t) => (completedBy.get(t.id) ?? t.assigneeId) === m.userId
        );
        const assigned = tasks.filter((t) => t.assigneeId === m.userId);
        return {
          userId: m.userId,
          name: m.user.name,
          role: m.role,
          assigned: assigned.length,
          completed: doneByMember.length,
          completedOnTime: doneByMember.filter((t) => !isLate(t)).length,
          xpContributed: doneByMember.reduce((sum, t) => sum + t.xpReward, 0),
          aiQuestions: aiMap.get(statKey(team.id, m.userId)) ?? 0,
          activeLast7Days: activeMap.get(statKey(team.id, m.userId)) ?? 0,
        };
      });

      const totalContribution = members.reduce((s, m) => s + m.completed, 0);
      const trend: Record<string, number> = {};
      for (let i = 0; i < TREND_DAYS; i++) trend[dayKey(new Date(sinceMs + i * DAY_MS))] = 0;
      const teamTrend = trendByTeam.get(team.id);
      if (teamTrend) {
        for (const [day, count] of teamTrend) {
          if (day in trend) trend[day] = count;
        }
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

    const payload = { scope: isAdmin ? "admin" : "member", teams: result };
    if (process.env.NODE_ENV === "production") {
      if (responseCache.size >= CACHE_MAX) responseCache.clear();
      responseCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, payload });
      await db.analyticsCache
        .upsert({
          where: { key: cacheKey },
          create: { key: cacheKey, payload: payload as unknown as Prisma.InputJsonValue },
          update: { payload: payload as unknown as Prisma.InputJsonValue },
        })
        .catch(() => null);
    }

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (e) {
    logger.error("[/api/collab/analytics GET]", { error: e });
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}
