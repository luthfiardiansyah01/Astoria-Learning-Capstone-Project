"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { CalendarClock, User } from "lucide-react";

export interface CollabTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  order: number;
  xpReward: number;
  documentId: string | null;
  dueDate: string | null;
  assignee: { id: string; name: string } | null;
}

export function TaskCard({ task, onOpen }: { task: CollabTask; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task.id)}
      className="p-3 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
    >
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      {task.dueDate && (
        <p
          className={`mt-2 flex items-center gap-1 text-xs ${
            task.status !== "done" && new Date(task.dueDate) < new Date()
              ? "text-red-600 dark:text-red-400"
              : "text-muted-foreground"
          }`}
        >
          <CalendarClock className="h-3 w-3" />
          {new Date(task.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" /> {task.assignee?.name ?? "Belum ditugaskan"}
        </span>
        <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5">
          +{task.xpReward} XP
        </span>
      </div>
    </Card>
  );
}
