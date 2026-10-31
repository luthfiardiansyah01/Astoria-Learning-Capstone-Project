"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCollabUi } from "./collab-store";
import { TaskMentorChat } from "./task-mentor-chat";
import { Trash2, BookOpen, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import type { CollabTask } from "./task-card";

export function TaskDetailPanel({ projectId }: { projectId: string }) {
  const activeTaskId = useCollabUi((s) => s.activeTaskId);
  const setActiveTask = useCollabUi((s) => s.setActiveTask);
  const queryClient = useQueryClient();
  const projectKey = ["collab", "project", projectId];

  const { data: project } = useQuery<{ tasks: CollabTask[] }>({
    queryKey: projectKey,
    queryFn: async () => {
      const res = await fetch(`/api/collab/projects/${projectId}`);
      if (!res.ok) throw new Error("Gagal memuat proyek.");
      return (await res.json()).project;
    },
    enabled: !!activeTaskId,
  });

  const task = project?.tasks.find((t) => t.id === activeTaskId) ?? null;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/collab/tasks/${activeTaskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Gagal menghapus tugas.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKey });
      setActiveTask(null);
      toast.success("Tugas dihapus.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: documents } = useQuery<{ id: string; fileName: string }[]>({
    queryKey: ["documents"],
    queryFn: async () => {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("Gagal memuat dokumen.");
      return (await res.json()).documents;
    },
    enabled: !!activeTaskId,
  });

  const linkDocMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await fetch(`/api/collab/tasks/${activeTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Gagal menautkan dokumen.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKey });
      toast.success("Dokumen modul ditautkan ke tugas.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dueMutation = useMutation({
    mutationFn: async (dueDate: string) => {
      const res = await fetch(`/api/collab/tasks/${activeTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: dueDate || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Gagal menyimpan tenggat.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKey });
      queryClient.invalidateQueries({ queryKey: ["collab", "analytics"] });
      toast.success("Tenggat tugas disimpan.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={!!activeTaskId} onOpenChange={(open) => !open && setActiveTask(null)}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {task && (
          <>
            <SheetHeader>
              <SheetTitle>{task.title}</SheetTitle>
              <SheetDescription>
                {task.description || "Tidak ada deskripsi."}
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4 space-y-4">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" /> Hapus Tugas
              </Button>
              <div className="space-y-1.5">
                <label htmlFor="task-due" className="flex items-center gap-1.5 text-sm font-semibold">
                  <CalendarClock className="h-4 w-4 text-primary" /> Tenggat
                </label>
                <input
                  id="task-due"
                  type="date"
                  value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                  onChange={(e) => dueMutation.mutate(e.target.value)}
                  disabled={dueMutation.isPending}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="task-doc" className="flex items-center gap-1.5 text-sm font-semibold">
                  <BookOpen className="h-4 w-4 text-primary" /> Dokumen Modul (konteks Mentor AI)
                </label>
                <select
                  id="task-doc"
                  value={task.documentId ?? ""}
                  onChange={(e) => linkDocMutation.mutate(e.target.value)}
                  disabled={linkDocMutation.isPending}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Tanpa dokumen</option>
                  {documents?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fileName}
                    </option>
                  ))}
                </select>
              </div>
              <TaskMentorChat taskId={task.id} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
