import { isHex } from "@/lib/theme/hex";

/**
 * Epics (Task.type EPIC) are the top of the one hierarchy: Epic > Story >
 * Task. They took over from projects (20261020130000_projects_into_epics),
 * so an epic carries what a project did: a colour, an owner, start and due
 * dates, and the work under it. Pure and client-safe.
 */

const SLOTS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"];

export interface EpicRef {
  id: string;
  title: string;
  color: string | null;
}

/**
 * An epic's colour as CSS: its own (strict hex, picked when it was made or
 * recoloured), else a chart slot that stays the same for that epic. No epic
 * at all is the muted ink.
 */
export function epicColor(
  epic: { id: string; color?: string | null } | string | null | undefined,
): string {
  if (!epic) return "var(--muted-foreground)";
  const id = typeof epic === "string" ? epic : epic.id;
  const own = typeof epic === "string" ? null : epic.color;
  if (own && isHex(own)) return own;
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `var(${SLOTS[h % SLOTS.length]})`;
}

interface Node {
  id: string;
  title: string;
  type: string;
  color?: string | null;
}

type WithParents = Node & {
  parentTask?: (Node & { parentTask?: Node | null }) | null;
};

/** The epic a task belongs to: itself, its parent or its grandparent; null outside one. */
export function epicOf(task: WithParents): EpicRef | null {
  const chain: (Node | null | undefined)[] = [task, task.parentTask, task.parentTask?.parentTask];
  const epic = chain.find((n) => n?.type === "EPIC");
  return epic ? { id: epic.id, title: epic.title, color: epic.color ?? null } : null;
}

/** The parent-type an editor may pick: what a task of `type` may sit inside. */
export function parentTypesFor(type: string): ("EPIC" | "STORY")[] {
  return type === "STORY" ? ["EPIC"] : type === "TASK" ? ["EPIC", "STORY"] : [];
}
