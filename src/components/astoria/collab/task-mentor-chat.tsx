"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send } from "lucide-react";
import { toast } from "sonner";
import { TEAM_BADGE_META } from "@/lib/collab-badge-meta";
import { RealtimeClock } from "../realtime-clock";
import { ElapsedTimer } from "../elapsed-timer";
import { AiQuotaBadge } from "../ai-quota-badge";
import { PlanBadge } from "../plan-badge";

interface TaskChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt?: string;
  user: { id: string; name: string } | null;
}

const wibTime = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatWib(iso?: string) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : wibTime.format(date);
}

export function TaskMentorChat({ taskId }: { taskId: string }) {
  const [question, setQuestion] = useState("");
  const queryClient = useQueryClient();
  const queryKey = ["collab", "task-mentor", taskId];

  const { data } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/collab/tasks/${taskId}/mentor`);
      if (!res.ok) throw new Error("Gagal memuat chat.");
      return (await res.json()).messages as TaskChatMessage[];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/collab/tasks/${taskId}/mentor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Mentor AI sedang tidak tersedia.");
      return body;
    },
    onSuccess: (body: { newBadges?: string[] }) => {
      for (const badge of body.newBadges ?? []) {
        toast.success(`Badge tim baru: ${TEAM_BADGE_META[badge]?.emoji ?? "🏅"} ${badge}`);
      }
      queryClient.invalidateQueries({ queryKey: ["collab", "leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage"] });
      setQuestion("");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => {
      toast.error(e.message);
      queryClient.invalidateQueries({ queryKey: ["ai-usage"] });
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 text-sm font-semibold">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" /> Mentor AI — Task Ini
        </span>
        <span className="flex items-center gap-1.5">
          <PlanBadge />
          <AiQuotaBadge />
          <RealtimeClock className="text-[10px] font-normal text-muted-foreground" />
        </span>
      </div>
      <ScrollArea className="h-56 rounded-md border p-3">
        <div className="space-y-3">
          {(data ?? []).map((m, i) => {
            const prev = (data ?? [])[i - 1];
            const answerMs =
              m.role === "assistant" && prev?.role === "user" && prev.createdAt && m.createdAt
                ? new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime()
                : null;
            const sentAt = formatWib(m.createdAt);

            return (
              <div key={m.id} className={m.role === "assistant" ? "" : "text-right"}>
                <p
                  className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-xs ${
                    m.role === "assistant"
                      ? "bg-muted text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {m.content}
                </p>
                {sentAt && (
                  <p
                    className={`mt-0.5 text-[9px] ${
                      m.role === "assistant" ? "text-muted-foreground" : "text-primary-foreground/70"
                    }`}
                  >
                    {m.role === "assistant" ? "Dijawab" : "Dikirim"} {sentAt} WIB
                    {m.role === "assistant" && answerMs != null && answerMs >= 0
                      ? ` • ${(answerMs / 1000).toFixed(1).replace(".", ",")} dtk`
                      : ""}
                  </p>
                )}
              </div>
            );
          })}
          {(data ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Tanyakan sesuatu tentang task ini ke Mentor AI.
            </p>
          )}
          {mutation.isPending && (
            <div className="flex justify-start">
              <ElapsedTimer
                prefix="Mentor menulis"
                className="text-[11px] text-muted-foreground"
              />
            </div>
          )}
        </div>
      </ScrollArea>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) mutation.mutate();
        }}
        className="flex gap-2"
      >
        <Input
          placeholder="Tanya mentor tentang task ini..."
          data-testid="task-mentor-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={mutation.isPending}
        />
        <Button type="submit" size="sm" data-testid="task-mentor-send" disabled={mutation.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
