"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateTeamDialog } from "./create-team-dialog";
import { CreateProjectDialog } from "./create-project-dialog";
import { TeamMembers } from "./team-members";
import { TeamBadges } from "./team-badges";
import { NotificationBell } from "./notification-bell";
import { TeamCardMenu } from "./team-card-menu";
import { ProjectItemMenu } from "./project-item-menu";
import { QueryState } from "@/components/astoria/query-state";
import { BarChart3, FolderKanban, Users2 } from "lucide-react";

interface Team {
  id: string;
  name: string;
  xp: number;
  level: number;
  members: { userId: string; role: string; user: { id: string; name: string } }[];
  invites: { id: string; userId: string; user: { id: string; name: string } }[];
  projects: { id: string; name: string; description: string | null }[];
  badges: { name: string }[];
}

export function ProjectList() {
  const { data: session } = useSession();
  const reduceMotion = useReducedMotion();
  const { data, isLoading, isError, refetch } = useQuery({
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

      <QueryState
        isLoading={isLoading}
        isError={isError}
        isEmpty={(data?.length ?? 0) === 0}
        onRetry={() => refetch()}
        loadingText="Memuat tim..."
        errorText="Gagal memuat tim. Periksa koneksi lalu coba lagi."
        emptyText="Kamu belum tergabung dalam tim. Buat tim baru untuk mulai berkolaborasi."
      >
        <div className="grid gap-4 sm:grid-cols-2">
        {data?.map((team, index) => {
          const isOwner = team.members.some(
            (m) => m.userId === session?.user?.id && m.role === "owner"
          );
          return (
            <motion.div
              key={team.id}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: reduceMotion ? 0 : index * 0.05 }}
            >
              <Card className="h-full">
                <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex min-w-0 items-center gap-1.5 text-base">
                    <Users2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{team.name}</span>
                  </CardTitle>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      Lv.{team.level} · {team.xp} XP
                    </span>
                    {isOwner && <TeamCardMenu team={team} />}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <TeamBadges badges={team.badges.map((b) => b.name)} />
                <TeamMembers teamId={team.id} members={team.members} invites={team.invites} />

                <div className="space-y-1.5">
                  {team.projects.map((p) => (
                    <div key={p.id} className="flex items-center gap-1">
                      <Link
                        href={`/collab/${p.id}`}
                        className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"
                      >
                        <FolderKanban className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate">{p.name}</span>
                      </Link>
                      <ProjectItemMenu project={p} />
                    </div>
                  ))}
                  {team.projects.length === 0 && (
                    <p className="text-xs text-muted-foreground px-2">Belum ada proyek.</p>
                  )}
                </div>

                <CreateProjectDialog teamId={team.id} />
              </CardContent>
            </Card>
            </motion.div>
          );
        })}
        </div>
      </QueryState>
    </div>
  );
}
