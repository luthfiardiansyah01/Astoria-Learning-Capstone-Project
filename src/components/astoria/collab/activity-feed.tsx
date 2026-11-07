"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Award, CheckCircle2, PlusCircle, Sparkles, Trophy, UserPlus, ArrowRightLeft } from "lucide-react";

interface ActivityEvent {
  id: string;
  type: string;
  createdAt: string;
  user: { id: string; name: string } | null;
  task: { id: string; title: string } | null;
  payload: Record<string, unknown> | null;
}

const ICONS: Record<string, React.ElementType> = {
  task_created: PlusCircle,
  task_moved: ArrowRightLeft,
  task_completed: CheckCircle2,
  member_joined: UserPlus,
  member_invited: UserPlus,
  ai_mentor_used: Sparkles,
  xp_awarded: Trophy,
  badge_earned: Award,
};

const LABELS: Record<string, (e: ActivityEvent) => string> = {
  task_created: (e) => `${e.user?.name ?? "Seseorang"} membuat tugas "${e.task?.title ?? ""}"`,
  task_moved: (e) =>
    `${e.user?.name ?? "Seseorang"} memindahkan "${e.task?.title ?? ""}" ke ${e.payload?.to ?? "-"}`,
  task_completed: (e) => `${e.user?.name ?? "Seseorang"} menyelesaikan "${e.task?.title ?? ""}"`,
  member_joined: (e) => `${e.payload?.name ?? e.user?.name ?? "Anggota baru"} bergabung ke tim`,
  member_invited: (e) =>
    `${e.user?.name ?? "Seseorang"} mengundang ${e.payload?.name ?? "anggota baru"}`,
  ai_mentor_used: (e) => `${e.user?.name ?? "Seseorang"} bertanya ke Mentor AI di "${e.task?.title ?? ""}"`,
  xp_awarded: (e) => `Tim mendapat +${e.payload?.xp ?? 0} XP`,
  badge_earned: (e) => `Tim meraih badge ${e.payload?.emoji ?? ""} ${e.payload?.badge ?? ""}`.replace(/  +/g, " "),

};

export function ActivityFeed({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["collab", "activity", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/collab/projects/${projectId}/activity`);
      if (!res.ok) throw new Error("Gagal memuat aktivitas.");
      return (await res.json()).activity as ActivityEvent[];
    },
    refetchInterval: 15000,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Activity className="h-4 w-4 text-primary" /> Aktivitas Tim
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 max-h-80 overflow-y-auto astoria-scroll">
        {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
        {data?.length === 0 && (
          <p className="text-xs text-muted-foreground">Belum ada aktivitas.</p>
        )}
        {data?.map((e) => {
          const Icon = ICONS[e.type] ?? Activity;
          const label = LABELS[e.type]?.(e) ?? e.type;
          return (
            <div key={e.id} className="flex items-start gap-2 text-xs">
              <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p>{label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(e.createdAt).toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
