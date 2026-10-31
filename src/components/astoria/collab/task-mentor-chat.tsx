"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send } from "lucide-react";
import { toast } from "sonner";
import { TEAM_BADGE_META } from "@/lib/collab-badge-meta";

interface TaskChatMessage {
  id: string;
  role: string;
  content: string;
  user: { id: string; name: string } | null;
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
      setQuestion("");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-primary" /> Mentor AI — Task Ini
      </div>
      <ScrollArea className="h-56 rounded-md border p-3">
        <div className="space-y-3">
          {(data ?? []).map((m) => (
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
            </div>
          ))}
          {(data ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Tanyakan sesuatu tentang task ini ke Mentor AI.
            </p>
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
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={mutation.isPending}
        />
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
