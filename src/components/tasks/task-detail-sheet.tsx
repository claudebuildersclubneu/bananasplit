"use client";

import dynamic from "next/dynamic";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

import type { TaskEditorDefaults } from "./task-editor";
import type { TaskItem } from "./types";

// The editor brings markdown, mentions and comments with it. Every layout
// renders this sheet, but most visits never open it, so the editor's code
// is fetched the first time the panel opens rather than with the page.
const TaskEditor = dynamic(() => import("./task-editor").then((m) => m.TaskEditor), {
  ssr: false,
});

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
  onChanged,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskItem | null;
  defaults?: TaskEditorDefaults;
  onOpenTask: (taskId: string) => void;
  /** Reads the shown task again after a change made from the panel. */
  onChanged: (taskId: string) => Promise<void>;
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
            // Keyed on the version too, so a reloaded task (after joining,
            // say) starts the form from what was saved, with the version a
            // later Save must send.
            key={
              task
                ? `${task.id}-${task.version}`
                : `new-${defaults?.parentTaskId ?? "top"}-${defaults?.status ?? ""}-${defaults?.projectId ?? ""}-${defaults?.dueDate ?? ""}`
            }
            task={task}
            defaults={defaults}
            onDone={() => onOpenChange(false)}
            onOpenTask={onOpenTask}
            onChanged={task ? () => onChanged(task.id) : undefined}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
