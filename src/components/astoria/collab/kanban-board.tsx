"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { KanbanColumn } from "./kanban-column";
import { TaskCard, type CollabTask } from "./task-card";
import { useCollabUi } from "./collab-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { TEAM_BADGE_META } from "@/lib/collab-badge-meta";
import { toast } from "sonner";

const STATUSES = ["todo", "in_progress", "review", "done"];

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  teamId: string;
  team: { name: string };
  tasks: CollabTask[];
}

export function KanbanBoard({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const setActiveTask = useCollabUi((s) => s.setActiveTask);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [draggingTask, setDraggingTask] = useState<CollabTask | null>(null);

  const queryKey = ["collab", "project", projectId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/collab/projects/${projectId}`);
      if (!res.ok) throw new Error("Gagal memuat proyek.");
      return (await res.json()).project as ProjectData;
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const columns = useMemo(() => {
    const grouped: Record<string, CollabTask[]> = { todo: [], in_progress: [], review: [], done: [] };
    for (const t of data?.tasks ?? []) grouped[t.status]?.push(t);
    return grouped;
  }, [data]);

  const moveMutation = useMutation({
    mutationFn: async ({ taskId, status, order }: { taskId: string; status: string; order: number }) => {
      const res = await fetch(`/api/collab/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, order }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal memindahkan tugas.");
      return body;
    },
    onMutate: async ({ taskId, status, order }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ProjectData>(queryKey);
      if (previous) {
        queryClient.setQueryData<ProjectData>(queryKey, {
          ...previous,
          tasks: previous.tasks.map((t) => (t.id === taskId ? { ...t, status, order } : t)),
        });
      }
      return { previous };
    },
    onError: (e: Error, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      toast.error(e.message);
    },
    onSuccess: (body) => {
      if (body.xpAward?.levelNaik) {
        toast.success(`Tim naik ke Level ${body.xpAward.newLevel}! 🎉`);
      } else if (body.xpAward) {
        toast.success(`+${body.xpAward.xpDiperoleh} XP untuk tim!`);
      }
      for (const badge of (body.newBadges ?? []) as string[]) {
        toast.success(`Badge tim baru: ${TEAM_BADGE_META[badge]?.emoji ?? "🏅"} ${badge}`);
      }
      queryClient.invalidateQueries({ queryKey: ["collab", "teams"] });
      queryClient.invalidateQueries({ queryKey: ["collab", "leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["collab", "notifications"] });
      queryClient.invalidateQueries({ queryKey: ["collab", "activity", projectId] });
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/collab/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal membuat tugas.");
      return body.task;
    },
    onSuccess: () => {
      setNewTaskTitle("");
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["collab", "activity", projectId] });
      toast.success("Tugas berhasil ditambahkan.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleDragStart(e: DragStartEvent) {
    const task = data?.tasks.find((t) => t.id === e.active.id);
    setDraggingTask(task ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggingTask(null);
    const { active, over } = e;
    if (!over) return;

    const taskId = String(active.id);
    const task = data?.tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Dropped over a column (status id) or over another task (use its status)
    const overId = String(over.id);
    const targetStatus = STATUSES.includes(overId)
      ? overId
      : data?.tasks.find((t) => t.id === overId)?.status ?? task.status;

    if (targetStatus === task.status) return;

    const targetColumnTasks = columns[targetStatus] ?? [];
    const newOrder = targetColumnTasks.length;

    moveMutation.mutate({ taskId, status: targetStatus, order: newOrder });
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat papan...</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Proyek tidak ditemukan.</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{data.name}</h1>
        <p className="text-sm text-muted-foreground">{data.team.name}</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newTaskTitle.trim()) createTaskMutation.mutate();
        }}
        className="flex gap-2 max-w-md"
      >
        <Input
          placeholder="Tambah tugas baru..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={createTaskMutation.isPending} className="gap-1">
          <Plus className="h-4 w-4" /> Tambah
        </Button>
      </form>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={columns[status] ?? []}
              onOpenTask={setActiveTask}
            />
          ))}
        </div>
        <DragOverlay>
          {draggingTask ? <TaskCard task={draggingTask} onOpen={() => {}} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
