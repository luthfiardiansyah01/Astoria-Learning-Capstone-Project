import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { KanbanBoard } from "@/components/astoria/collab/kanban-board";
import { TeamLeaderboard } from "@/components/astoria/collab/team-leaderboard";
import { ActivityFeed } from "@/components/astoria/collab/activity-feed";
import { NotificationBell } from "@/components/astoria/collab/notification-bell";
import { TaskDetailPanel } from "@/components/astoria/collab/task-detail-panel";

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { projectId } = await params;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 grid gap-6 lg:grid-cols-[1fr_300px]">
      <KanbanBoard projectId={projectId} />
      <div className="space-y-4">
        <div className="flex justify-end">
          <NotificationBell />
        </div>
        <TeamLeaderboard />
        <ActivityFeed projectId={projectId} />
      </div>
      <TaskDetailPanel projectId={projectId} />
    </main>
  );
}
