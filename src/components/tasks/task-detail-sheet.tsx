"use client";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { TaskEditor, type TaskEditorDefaults } from "./task-editor";
import type { TaskItem } from "./types";

/**
 * The one task surface.
 *
 * A side panel rather than a centred modal: you keep the list you came from
 * in view, which matters when you are working down a week or dragging a
 * board. On a phone it is a card in the middle of the screen, as New event
 * is, rather than a panel down the side.
 *
 * It renders once, at the top of the workspace, and every layout opens it
 * through useTasks().openTask / showTask. Purely presentational: the
 * provider owns which task is shown, and the editor draws the panel's
 * header, body and footer.
 */
export function TaskDetailSheet({
  open,
  onOpenChange,
  task,
  defaults,
  onOpenTask,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskItem | null;
  defaults?: TaskEditorDefaults;
  onOpenTask: (taskId: string) => void;
  busy?: boolean;
}) {
  const heading = task ? task.title : defaults?.parentTaskId ? "New subtask" : "New task";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        aria-busy={busy}
        showCloseButton={false}
        className={cn(
          "bg-background gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[460px]",
          // A phone: the event form's card (DialogContent) instead of a side panel.
          "max-md:bg-popover max-md:ring-foreground/6 max-md:rounded-card max-md:shadow-e2 max-md:overflow-hidden max-md:border-0 max-md:ring-1",
          "max-md:-translate-x-1/2 max-md:-translate-y-1/2 max-md:data-[side=right]:inset-auto max-md:data-[side=right]:top-1/2 max-md:data-[side=right]:left-1/2",
          "max-md:data-[side=right]:h-[min(85svh,46rem)] max-md:data-[side=right]:w-[calc(100%-2rem)]",
          "max-md:data-open:zoom-in-95 max-md:data-closed:zoom-out-95 max-md:data-[side=right]:data-open:slide-in-from-right-0 max-md:data-[side=right]:data-closed:slide-out-to-right-0",
        )}
      >
        <SheetTitle className="sr-only">{heading}</SheetTitle>
        <SheetDescription className="sr-only">
          Edit this task, its people, its subtasks, its comments and who can see it.
        </SheetDescription>
        {open && (
          <TaskEditor
            key={
              task?.id ??
              `new-${defaults?.parentTaskId ?? "top"}-${defaults?.status ?? ""}-${defaults?.projectId ?? ""}-${defaults?.dueDate ?? ""}`
            }
            task={task}
            defaults={defaults}
            onDone={() => onOpenChange(false)}
            onOpenTask={onOpenTask}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
