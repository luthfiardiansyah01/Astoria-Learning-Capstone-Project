"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCollabUi } from "./collab-store";
import { TaskMentorChat } from "./task-mentor-chat";
import { Trash2, BookOpen, CalendarClock, Save } from "lucide-react";
import { toast } from "sonner";
import type { CollabTask } from "./task-card";

interface ProjectDetail {
  tasks: CollabTask[];
  team: {
    members: { userId: string; role: string; user: { id: string; name: string } }[];
  };
}

export function TaskDetailPanel({ projectId }: { projectId: string }) {
  const activeTaskId = useCollabUi((s) => s.activeTaskId);
  const setActiveTask = useCollabUi((s) => s.setActiveTask);
  const projectKey = ["collab", "project", projectId];

  const { data: project } = useQuery<ProjectDetail>({
    queryKey: projectKey,
    queryFn: async () => {
      const res = await fetch(`/api/collab/projects/${projectId}`);
      if (!res.ok) throw new Error("Gagal memuat proyek.");
      return (await res.json()).project;
    },
    enabled: !!activeTaskId,
  });

  const task = project?.tasks.find((t) => t.id === activeTaskId) ?? null;

  return (
    <Sheet open={!!activeTaskId} onOpenChange={(open) => !open && setActiveTask(null)}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {task && (
          <TaskForm
            key={task.id}
            task={task}
            projectId={projectId}
            members={project?.team.members ?? []}
            onDeleted={() => setActiveTask(null)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function TaskForm({
  task,
  projectId,
  members,
  onDeleted,
}: {
  task: CollabTask;
  projectId: string;
  members: { userId: string; role: string; user: { id: string; name: string } }[];
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const projectKey = ["collab", "project", projectId];

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id ?? "");
  const [status, setStatus] = useState(task.status);
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/collab/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          assigneeId: assigneeId || null,
          status,
          dueDate: dueDate || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal menyimpan tugas.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKey });
      queryClient.invalidateQueries({ queryKey: ["collab", "analytics"] });
      queryClient.invalidateQueries({ queryKey: ["collab", "activity", projectId] });
      toast.success("Tugas diperbarui.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/collab/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Gagal menghapus tugas.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKey });
      queryClient.invalidateQueries({ queryKey: ["collab", "analytics"] });
      onDeleted();
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
  });

  const linkDocMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await fetch(`/api/collab/tasks/${task.id}`, {
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

  return (
    <>
      <SheetHeader>
        <SheetTitle>{task.title}</SheetTitle>
        <SheetDescription>Ubah detail tugas, penetapan anggota, dan tenggat.</SheetDescription>
      </SheetHeader>
      <div className="px-4 pb-4 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="task-title" className="text-sm font-semibold">
            Judul
          </label>
          <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="task-description" className="text-sm font-semibold">
            Deskripsi
          </label>
          <Textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Detail tugas (opsional)"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="task-status" className="text-sm font-semibold">
            Status
          </label>
          <select
            id="task-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="todo">Todo</option>
            <option value="in_progress">Dikerjakan</option>
            <option value="review">Review</option>
            <option value="done">Selesai</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="task-assignee" className="text-sm font-semibold">
            Ditugaskan ke
          </label>
          <select
            id="task-assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">Belum ditugaskan</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user.name}
                {m.role === "owner" ? " (owner)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="task-due" className="flex items-center gap-1.5 text-sm font-semibold">
            <CalendarClock className="h-4 w-4 text-primary" /> Tenggat
          </label>
          <input
            id="task-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !title.trim()}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" /> Hapus Tugas
          </Button>
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
  );
}
