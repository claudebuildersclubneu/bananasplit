"use client";

import { ArrowLeft, ChevronDown, ClipboardPaste, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ActionItemsImport } from "@/components/ai/action-items-import";
import { useTasks, useWorkspace } from "@/components/tasks/tasks-context";
import { WorkspaceToolbar } from "@/components/tasks/workspace-toolbar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  hasModifier,
  isTypingTarget,
  NEW_TASK_PARAM,
  overlayOpen,
  SCOPE_KEYS,
  TASK_KEYS,
} from "@/lib/shortcuts";

import { isDestination, TASK_LAYOUTS, type TaskLayout } from "./views";

/**
 * The workspace header: the title and New task. Nothing else competes for
 * the corner: the dashboard is a layout in the toolbar, Requests is gone,
 * and the weekly update shows where it's relevant (the Week's strip, the
 * dashboard), not as a button sitting here all week.
 *
 * Inside the weekly update the header collapses to a back link: the filter
 * toolbar has nothing to filter there, and leaving it on screen would
 * suggest otherwise.
 *
 * "Paste a list" is a way of making tasks, so it sits in New task's menu
 * rather than beside it.
 */
export function WorkspaceHeader({
  teamwork = true,
}: {
  /** The weekly update exists (a club's layouts; not Personal or the Free plan). */
  teamwork?: boolean;
}) {
  const { newTask, org } = useTasks();
  const ws = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [importing, setImporting] = useState(false);
  const inDestination = isDestination(ws.query.view);
  const projectId = ws.query.projectId ?? null;

  // The single keys (src/lib/shortcuts.ts, listed on the ⌘/ sheet): 1-4
  // switch layout (4 is the dashboard), c starts a task, m / t / e pick
  // whose work, x clears the filters, u opens the weekly update. Typing in a
  // field never triggers them, nor does a key an open menu uses.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || hasModifier(event) || isTypingTarget(event)) return;
      if (overlayOpen()) return;
      const run = (action: () => void) => {
        event.preventDefault();
        action();
      };
      const key = event.key.toLowerCase();
      const index = Number.parseInt(event.key, 10);
      if (!ws.simple && index >= 1 && index <= TASK_LAYOUTS.length) {
        return run(() => ws.setView(TASK_LAYOUTS[index - 1]!.value as TaskLayout));
      }
      if (key === TASK_KEYS.newTask) return run(() => newTask({ projectId }));
      if (teamwork && key === TASK_KEYS.updates) return run(() => ws.setView("updates"));
      // The rest narrow a layout; a destination has nothing to narrow.
      if (inDestination) return;
      const scope = ws.scopes.find((s) => SCOPE_KEYS[s.value] === key);
      if (scope) return run(() => ws.setScope(scope.value));
      if (key === TASK_KEYS.clearFilters) {
        return run(() => router.push(`/app/${org.slug}/tasks?view=${ws.query.view}`));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ws, newTask, projectId, teamwork, inDestination, router, org.slug]);

  // `c` pressed elsewhere in the app lands here with ?new=1: start the task,
  // then drop the param so a reload or Back doesn't start another.
  const startNew = searchParams.get(NEW_TASK_PARAM) === "1";
  useEffect(() => {
    if (!startNew) return;
    newTask({ projectId });
    const params = new URLSearchParams(searchParams.toString());
    params.delete(NEW_TASK_PARAM);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [startNew, newTask, projectId, searchParams, router, pathname]);

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
          ) : null}

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
