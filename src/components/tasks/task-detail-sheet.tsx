"use client";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

import { TaskEditor, type TaskEditorDefaults } from "./task-editor";
import type { TaskItem } from "./types";

/**
 * The one task surface.
 *
 * A side panel rather than a centred modal: you keep the list you came from
 * in view, which matters when you are working down a week or dragging a
 * board. On a phone it takes the full width, because there is nothing to
 * keep in view anyway.
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
        className="bg-background gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[460px]"
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
