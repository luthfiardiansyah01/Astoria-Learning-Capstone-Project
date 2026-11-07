"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { xpForNextLevel } from "@/lib/gamif";
import { Progress } from "@/components/ui/progress";
import { Trophy } from "lucide-react";
import { TeamBadges } from "./team-badges";
import { QueryState } from "@/components/astoria/query-state";

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  xp: number;
  level: number;
  memberCount: number;
  badges: string[];
}

const MEDAL = ["🥇", "🥈", "🥉"];

export function TeamLeaderboard() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["collab", "leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/collab/teams/leaderboard");
      if (!res.ok) throw new Error("Gagal memuat leaderboard.");
      return (await res.json()).leaderboard as LeaderboardEntry[];
    },
    refetchInterval: 15000,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Trophy className="h-4 w-4 text-amber-500" /> Leaderboard Tim
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          isEmpty={(data?.length ?? 0) === 0}
          onRetry={() => refetch()}
          loadingText="Memuat leaderboard..."
          errorText="Gagal memuat leaderboard."
          emptyText="Belum ada tim di leaderboard."
        >
          {data?.map((team) => {
            const progress = xpForNextLevel(team.xp);
            return (
              <div key={team.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    {team.rank <= 3 ? MEDAL[team.rank - 1] : `#${team.rank}`} {team.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Lv.{team.level} · {team.xp} XP
                  </span>
                </div>
                <Progress value={progress.pct} className="h-1.5" />
                <TeamBadges badges={team.badges} />
              </div>
            );
          })}
        </QueryState>
      </CardContent>
    </Card>
  );
}
