"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TeamBadges } from "./team-badges";
import { AlertTriangle, CheckCircle2, Clock, Users, Zap } from "lucide-react";

interface MemberStat {
  userId: string;
  name: string;
  role: string;
  assigned: number;
  completed: number;
  completedOnTime: number;
  xpContributed: number;
  aiQuestions: number;
  activeLast7Days: number;
  contributionPct: number;
}

interface TeamAnalytics {
  id: string;
  name: string;
  xp: number;
  level: number;
  badges: string[];
  summary: {
    totalTasks: number;
    byStatus: Record<string, number>;
    completionRate: number;
    overdueCount: number;
    lateCompletedCount: number;
    activeMembers7d: number;
    memberCount: number;
  };
  members: MemberStat[];
  overdue: { id: string; title: string; project: string; dueDate: string; assignee: string | null; daysLate: number }[];
  trend: { date: string; count: number }[];
}

const STATUS_LABEL: Record<string, string> = {
  todo: "To Do",
  in_progress: "Dikerjakan",
  review: "Review",
  done: "Selesai",
};

export function AnalyticsDashboard() {
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["collab", "analytics"],
    queryFn: async () => {
      const res = await fetch("/api/collab/analytics");
      if (!res.ok) throw new Error("Gagal memuat analitik.");
      return (await res.json()) as { scope: "admin" | "member"; teams: TeamAnalytics[] };
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat analitik...</p>;
  if (isError || !data) return <p className="text-sm text-destructive">Gagal memuat analitik.</p>;
  if (data.teams.length === 0)
    return <p className="text-sm text-muted-foreground">Belum ada tim untuk dianalisis.</p>;

  const team = data.teams.find((t) => t.id === selected) ?? data.teams[0];
  const s = team.summary;
  const inactive = team.members.filter((m) => m.activeLast7Days === 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-xl font-bold">
          Dashboard Analitik {data.scope === "admin" ? "(semua tim)" : "Tim"}
        </h1>
        {data.teams.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              t.id === team.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <TeamBadges badges={team.badges} showEmpty />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CheckCircle2} label="Tugas selesai" value={`${s.completionRate}%`} hint={`${s.byStatus.done}/${s.totalTasks} tugas`} />
        <StatCard icon={AlertTriangle} label="Tugas terlambat" value={String(s.overdueCount)} hint={`${s.lateCompletedCount} selesai terlambat`} warn={s.overdueCount > 0} />
        <StatCard icon={Users} label="Anggota aktif (7 hari)" value={`${s.activeMembers7d}/${s.memberCount}`} hint="punya aktivitas minggu ini" warn={inactive.length > 0} />
        <StatCard icon={Zap} label="XP tim" value={String(team.xp)} hint={`Level ${team.level}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Aktivitas 14 hari terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={team.trend.map((d) => ({ ...d, label: d.date.slice(5) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
                  <Tooltip />
                  <Bar dataKey="count" name="Aktivitas" fill="var(--color-primary, #047857)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status tugas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(STATUS_LABEL).map(([key, label]) => {
              const count = s.byStatus[key] ?? 0;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{label}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <Progress value={s.totalTasks ? (count / s.totalTasks) * 100 : 0} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Kontribusi per anggota</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3">Anggota</th>
                <th className="pr-3">Ditugaskan</th>
                <th className="pr-3">Selesai</th>
                <th className="pr-3">Tepat waktu</th>
                <th className="pr-3">XP</th>
                <th className="pr-3">Tanya AI</th>
                <th className="min-w-32">Kontribusi</th>
              </tr>
            </thead>
            <tbody>
              {team.members.map((m) => (
                <tr key={m.userId} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">
                    {m.name}
                    {m.role === "owner" && <span className="ml-1 text-xs text-muted-foreground">owner</span>}
                    {m.activeLast7Days === 0 && (
                      <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                        tidak aktif
                      </span>
                    )}
                  </td>
                  <td className="pr-3">{m.assigned}</td>
                  <td className="pr-3">{m.completed}</td>
                  <td className="pr-3">{m.completedOnTime}</td>
                  <td className="pr-3">{m.xpContributed}</td>
                  <td className="pr-3">{m.aiQuestions}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Progress value={m.contributionPct} className="h-1.5 w-20" />
                      <span className="text-xs text-muted-foreground">{m.contributionPct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Clock className="h-4 w-4 text-amber-600" /> Tugas melewati tenggat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {team.overdue.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada tugas terlambat.</p>}
          {team.overdue.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {t.project} · {t.assignee ?? "belum ditugaskan"}
                </p>
              </div>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/40 dark:text-red-400">
                terlambat {t.daysLate} hari
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  warn,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint: string;
  warn?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-lg p-2 ${warn ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40" : "bg-primary/10 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xl font-bold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}
