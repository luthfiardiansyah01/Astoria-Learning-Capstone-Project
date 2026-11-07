"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlarmClock, Award, Bell, Trophy, UserMinus, UserPlus } from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

const ICONS: Record<string, React.ElementType> = {
  member_added: UserPlus,
  team_invite: UserPlus,
  team_invite_declined: UserMinus,
  team_level_up: Trophy,
  badge_earned: Award,
  task_due_soon: AlarmClock,
  task_overdue: AlarmClock,
};

export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ["collab", "notifications"];

  const { data } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch("/api/collab/notifications");
      if (!res.ok) throw new Error("Gagal memuat notifikasi.");
      return (await res.json()) as { notifications: NotificationItem[]; unreadCount: number };
    },
    refetchInterval: 30000,
  });

  const markRead = useMutation({
    mutationFn: async (ids?: string[]) => {
      await fetch("/api/collab/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids ? { ids } : {}),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const unread = data?.unreadCount ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted transition-colors"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifikasi</p>
          {unread > 0 && (
            <button type="button" onClick={() => markRead.mutate(undefined)} className="text-xs text-primary hover:underline">
              Tandai semua dibaca
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {(data?.notifications ?? []).length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">Belum ada notifikasi.</p>
          )}
          {data?.notifications.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (!n.readAt) markRead.mutate([n.id]);
                  if (n.link) router.push(n.link);
                }}
                className={`flex w-full items-start gap-2 border-b px-3 py-2.5 text-left text-xs last:border-0 hover:bg-muted ${
                  n.readAt ? "opacity-60" : ""
                }`}
              >
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${n.type === "task_overdue" ? "text-red-600" : "text-primary"}`}
                />
                <span className="flex-1">
                  <span className="block font-medium">{n.title}</span>
                  {n.body && <span className="block text-muted-foreground">{n.body}</span>}
                  <span className="block text-[10px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString("id-ID")}
                  </span>
                </span>
                {!n.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-600" aria-hidden />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
