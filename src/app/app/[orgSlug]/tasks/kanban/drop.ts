import { arrayMove } from "@dnd-kit/sortable";

import type { TaskStatus } from "@/generated/prisma/enums";

/** Where a dropped card lands: its column and its new neighbours there. */
export interface DropPlan {
  status: TaskStatus;
  /** The card that ends up just above it, or null at the top. */
  beforeId: string | null;
  /** The card that ends up just below it, or null at the bottom. */
  afterId: string | null;
}

/**
 * Works out a board drop from what dnd-kit reports (the dragged card and
 * what it was over), matching what the drag preview showed:
 *
 * - Within a column the preview shifts cards the way arrayMove does, so
 *   dragging down lands AFTER the card you are over and dragging up lands
 *   before it.
 * - Into another column the card goes in front of the card you are over.
 * - Over a column itself (its empty space) the card goes to the bottom.
 *
 * Returns null when nothing would move: a card dropped on itself, or back
 * where it started.
 */
export function planDrop(
  columns: Readonly<Record<TaskStatus, readonly { id: string }[]>>,
  active: { id: string; status: TaskStatus },
  overId: string,
): DropPlan | null {
  if (overId === active.id) return null;

  let status: TaskStatus;
  let overTask = false;
  if (Object.hasOwn(columns, overId)) {
    status = overId as TaskStatus;
  } else {
    const found = (Object.keys(columns) as TaskStatus[]).find((s) =>
      columns[s].some((t) => t.id === overId),
    );
    if (!found) return null;
    status = found;
    overTask = true;
  }

  const column = columns[status].map((t) => t.id);
  let next: string[];
  if (status === active.status && column.includes(active.id)) {
    const from = column.indexOf(active.id);
    const to = overTask ? column.indexOf(overId) : column.length - 1;
    if (from === to) return null;
    next = arrayMove(column, from, to);
  } else {
    next = column.filter((id) => id !== active.id);
    const at = overTask ? next.indexOf(overId) : next.length;
    next.splice(at, 0, active.id);
  }

  const at = next.indexOf(active.id);
  return { status, beforeId: next[at - 1] ?? null, afterId: next[at + 1] ?? null };
}
