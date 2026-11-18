"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard, type CollabTask } from "./task-card";

const COLUMN_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "Sedang Dikerjakan",
  review: "Review",
  done: "Selesai",
};

export function KanbanColumn({
  status,
  tasks,
  onOpenTask,
  doneTotal,
  onLoadAllDone,
  loadingAllDone,
}: {
  status: string;
  tasks: CollabTask[];
  onOpenTask: (id: string) => void;
  doneTotal?: number;
  onLoadAllDone?: () => void;
  loadingAllDone?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const hasHiddenDone = status === "done" && typeof doneTotal === "number" && doneTotal > tasks.length;

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-${status}`}
      className={`flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 min-h-[240px] transition-colors ${
        isOver ? "border-primary bg-primary/5" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <h3 className="text-sm font-semibold">{COLUMN_LABELS[status] ?? status}</h3>
        <div className="flex items-center gap-2">
          {hasHiddenDone && (
            <button
              type="button"
              onClick={onLoadAllDone}
              disabled={loadingAllDone}
              className="text-[10px] font-medium text-primary hover:underline disabled:opacity-50"
            >
              {loadingAllDone ? "Memuat…" : `Muat semua (${doneTotal})`}
            </button>
          )}
          <span className="text-xs text-muted-foreground">{tasks.length}</span>
        </div>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpenTask} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
