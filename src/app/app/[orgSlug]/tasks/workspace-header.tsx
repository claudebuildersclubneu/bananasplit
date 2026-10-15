"use client";

import { ArrowLeft, ChevronDown, ClipboardPaste, Inbox, NotebookPen, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { ActionItemsImport } from "@/components/ai/action-items-import";
import { useTasks, useWorkspace } from "@/components/tasks/tasks-context";
import { WorkspaceToolbar } from "@/components/tasks/workspace-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { isDestination, TASK_LAYOUTS, type TaskLayout } from "./views";

/**
 * The workspace header.
 *
 * Requests and the Sunday update used to be two of seven equal tabs. They
 * are not layouts — you do not "look at the board as a Sunday update" — so
 * they sit here as destinations instead, next to New task. Pulling them out
 * is what lets the tab row become five genuine views of one question.
 *
 * Inside a destination the header collapses to a back link: the filter
 * toolbar has nothing to filter there, and leaving it on screen would
 * suggest otherwise.
 *
 * "Paste a list" is a way of making tasks, so it sits in New task's menu
 * rather than beside it.
 */
export function WorkspaceHeader({
  intakeCount,
  showIntake,
  posted,
  teamwork = true,
}: {
  /** Open requests waiting in the intake queue. */
  intakeCount: number;
  showIntake: boolean;
  /** Whether the viewer already posted this week's Sunday update. */
  posted: boolean;
  /** Requests and the Sunday update (not in a Personal space). */
  teamwork?: boolean;
}) {
  const { newTask, org } = useTasks();
  const ws = useWorkspace();
  const [importing, setImporting] = useState(false);
  const inDestination = isDestination(ws.query.view);

  // 1-3 switch layout, c starts a task. Typing in a field never triggers them.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      if (document.querySelector("[role=dialog][data-state=open]")) return;

      const index = Number.parseInt(event.key, 10);
      if (!ws.simple && index >= 1 && index <= TASK_LAYOUTS.length) {
        event.preventDefault();
        ws.setView(TASK_LAYOUTS[index - 1]!.value as TaskLayout);
        return;
      }
      if (event.key === "c") {
        event.preventDefault();
        newTask({ projectId: ws.query.projectId ?? null });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ws, newTask]);

  return (
    <div className="mb-5 space-y-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <h1 className="page-title mr-auto">Tasks</h1>

        <div className="flex flex-wrap items-center gap-2">
          {inDestination ? (
            <Button variant="ghost" size="sm" onClick={() => ws.setView("board")}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to tasks
            </Button>
          ) : ws.simple || !teamwork ? null : (
            <>
              {showIntake && (
                <DestinationButton
                  icon={Inbox}
                  label="Requests"
                  hint={
                    intakeCount > 0
                      ? `${intakeCount} request${intakeCount === 1 ? "" : "s"} waiting on triage`
                      : "The intake queue"
                  }
                  count={intakeCount}
                  onClick={() => ws.setView("intake")}
                />
              )}
              <DestinationButton
                icon={NotebookPen}
                label="Sunday update"
                hint={posted ? "You have posted this week" : "Draft and post this week's update"}
                dot={!posted}
                onClick={() => ws.setView("updates")}
              />
            </>
          )}

          {/* New task, with "Paste a list" in its menu (just New task on the Free plan). */}
          {ws.simple ? (
            <Button
              size="sm"
              title="New task (c)"
              onClick={() => newTask({ projectId: ws.query.projectId ?? null })}
            >
              <Plus className="size-4" aria-hidden="true" />
              New task
            </Button>
          ) : (
            <div className="flex">
              <Button
                size="sm"
                className="rounded-r-none"
                title="New task (c)"
                onClick={() => newTask({ projectId: ws.query.projectId ?? null })}
              >
                <Plus className="size-4" aria-hidden="true" />
                New task
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="border-primary-foreground/25 rounded-l-none border-l px-1.5"
                    aria-label="More ways to add tasks"
                  >
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem
                    onSelect={() => newTask({ projectId: ws.query.projectId ?? null })}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    New task
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setImporting(true)}>
                    <ClipboardPaste className="size-4" aria-hidden="true" />
                    <span className="flex flex-col">
                      Paste a list
                      <span className="text-muted-foreground text-xs">
                        A to-do list or meeting notes, turned into tasks
                      </span>
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {!inDestination && <WorkspaceToolbar />}
      {importing && (
        <ActionItemsImport
          orgId={org.id}
          orgSlug={org.slug}
          open={importing}
          onOpenChange={setImporting}
        />
      )}
    </div>
  );
}

function DestinationButton({
  icon: Icon,
  label,
  hint,
  count,
  dot,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  hint?: string;
  count?: number;
  /** A quiet "there is something to do here" marker. */
  dot?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      title={hint}
      aria-label={hint ? `${label}: ${hint}` : label}
    >
      <Icon className="size-4" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
      {count !== undefined && count > 0 && (
        <Badge className="h-4 min-w-4 px-1 text-[10px]">{count}</Badge>
      )}
      {dot && <span className="bg-warning size-1.5 rounded-full" aria-hidden />}
    </Button>
  );
}
