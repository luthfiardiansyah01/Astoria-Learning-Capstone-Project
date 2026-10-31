"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateTeamDialog } from "./create-team-dialog";
import { CreateProjectDialog } from "./create-project-dialog";
import { TeamMembers } from "./team-members";
import { TeamBadges } from "./team-badges";
import { NotificationBell } from "./notification-bell";
import { BarChart3, FolderKanban, Users2 } from "lucide-react";

interface Team {
  id: string;
  name: string;
  xp: number;
  level: number;
  members: { userId: string; role: string; user: { id: string; name: string } }[];
  projects: { id: string; name: string }[];
  badges: { name: string }[];
}

export function ProjectList() {
  const { data, isLoading } = useQuery({
    queryKey: ["collab", "teams"],
    queryFn: async () => {
      const res = await fetch("/api/collab/teams");
      if (!res.ok) throw new Error("Gagal memuat tim.");
      return (await res.json()).teams as Team[];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">SOBAT ADI — Tim & Proyek Saya</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/collab/analytics"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            <BarChart3 className="h-4 w-4" /> Analitik
          </Link>
          <CreateTeamDialog />
          <NotificationBell />
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
      {!isLoading && data?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Kamu belum tergabung dalam tim. Buat tim baru untuk mulai berkolaborasi.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {data?.map((team) => (
          <Card key={team.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <Users2 className="h-4 w-4" /> {team.name}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  Lv.{team.level} · {team.xp} XP
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <TeamBadges badges={team.badges.map((b) => b.name)} />
              <TeamMembers teamId={team.id} members={team.members} />

              <div className="space-y-1.5">
                {team.projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/collab/${p.id}`}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"
                  >
                    <FolderKanban className="h-3.5 w-3.5 text-primary" /> {p.name}
                  </Link>
                ))}
                {team.projects.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2">Belum ada proyek.</p>
                )}
              </div>

              <CreateProjectDialog teamId={team.id} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
