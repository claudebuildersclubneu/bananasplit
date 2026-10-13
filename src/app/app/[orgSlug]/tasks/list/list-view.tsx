"use client";

import { ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { TASK_PANEL } from "@/components/tasks/layout-ui";
import { TaskRow } from "@/components/tasks/task-row";
import { useTasks, useWorkspace } from "@/components/tasks/tasks-context";
import type { TaskItem } from "@/components/tasks/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The List: the Free plan's task view. One list of what is open, soonest
 * due first, and what was done this week folded away underneath. No
 * buckets, boards or tables: those are the Club plan's views.
 */
export function ListView({
  open,
  completed,
  hasMore,
  moreLimit,
}: {
  open: TaskItem[];
  completed: TaskItem[];
  hasMore: boolean;
  moreLimit: number;
}) {
  const { newTask } = useTasks();
  const ws = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showDone, setShowDone] = useState(false);
  const mine = ws.query.scope === "mine";

  function showMore() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", String(moreLimit));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  if (open.length === 0 && completed.length === 0) {
    return (
      <EmptyState
        title={ws.filterCount > 0 ? "Nothing matches that" : "No tasks yet"}
        description={
          ws.filterCount > 0
            ? "Clear the search or filters to see every task."
            : "Write down what needs doing and who is on it."
        }
        action={
          ws.filterCount > 0 ? undefined : (
            <Button size="sm" onClick={() => newTask()}>
              New task
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {open.length > 0 ? (
        <ul className={cn("divide-border divide-y", TASK_PANEL)} aria-label="Open tasks">
          {open.map((task) => (
            <TaskRow key={task.id} task={task} showOwner={!mine} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Everything here is done.</p>
      )}

      {hasMore && (
        <Button variant="outline" size="sm" onClick={showMore}>
          Show more open tasks
        </Button>
      )}

      {completed.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            className="text-muted-foreground hover:text-foreground -mx-1 flex items-center gap-1.5 rounded px-1 py-1 text-sm font-medium transition-colors"
          >
            <ChevronRight
              className={cn("size-4 transition-transform duration-150", showDone && "rotate-90")}
              aria-hidden="true"
            />
            Done in the last 7 days
            <span className="text-xs tabular-nums">{completed.length}</span>
          </button>
          {showDone && (
            <ul className={cn("divide-border mt-1.5 divide-y", TASK_PANEL)}>
              {completed.map((task) => (
                <TaskRow key={task.id} task={task} showOwner={!mine} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
