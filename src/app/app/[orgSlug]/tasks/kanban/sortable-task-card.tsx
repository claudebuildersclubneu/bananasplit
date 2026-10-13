"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { TaskCard } from "@/components/tasks/task-card";
import { TaskItemMenu } from "@/components/tasks/task-item-menu";
import { accessSubjectOf, useTasks } from "@/components/tasks/tasks-context";
import type { TaskItem } from "@/components/tasks/types";
import { canEditTask } from "@/lib/tasks/access";

export function SortableTaskCard({
  task,
  todayKey,
  onOpen,
}: {
  task: TaskItem;
  todayKey: string;
  onOpen: (taskId: string) => void;
}) {
  const { actor } = useTasks();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={
        "group focus-visible:ring-ring relative cursor-grab rounded-lg focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing" +
        (isDragging ? " opacity-40" : "")
      }
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task.id)}
      // dnd-kit's keyboard sensor starts a drag from this same onKeyDown, on
      // Space or Enter. Enter opens the card instead, like a button would,
      // so only Space picks it up. While a card is being dragged, Enter is
      // the sensor's "drop" key and must not also open it.
      onKeyDown={(e) => {
        if (e.key === "Enter" && !isDragging) {
          onOpen(task.id);
          return;
        }
        listeners?.onKeyDown?.(e);
      }}
      // Read as the task's title, not every word on the card (and not the
      // "…" menu's label inside it).
      aria-label={task.title}
    >
      <TaskCard task={task} todayKey={todayKey} />
      {/* The menu keeps its own clicks and drags (ItemMenu stops them). */}
      <TaskItemMenu
        task={{ id: task.id, title: task.title, subtaskCount: task.subtasks.length }}
        editable={canEditTask(actor, accessSubjectOf(task))}
        onOpen={() => onOpen(task.id)}
        className="bg-card absolute top-1.5 right-1.5 border opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
      />
    </div>
  );
}
