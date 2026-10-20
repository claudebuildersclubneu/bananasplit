/**
 * Epics, stories and tasks (pure). The database keeps the nesting in order
 * (app.task_hierarchy_guard):
 *
 *   EPIC   always top-level
 *   STORY  top-level, or inside an EPIC
 *   TASK   top-level, inside an EPIC or inside a STORY
 *
 * These functions say the same thing before anything is written, in words a
 * member can act on, and work out the quiet fix-ups: breaking a plain task
 * down makes it a story, and a childless task moved into a story becomes a
 * task. Clubs that never use epics only ever see tasks and stories (a task
 * with subtasks), exactly as before.
 */

export type TaskTypeValue = "EPIC" | "STORY" | "TASK";

export const TASK_TYPES: readonly { value: TaskTypeValue; label: string; hint: string }[] = [
  { value: "TASK", label: "Task", hint: "A single step" },
  { value: "STORY", label: "Story", hint: "A deliverable one person owns" },
  { value: "EPIC", label: "Epic", hint: "A big outcome that spans weeks" },
];

export function typeLabel(type: string): string {
  return TASK_TYPES.find((t) => t.value === type)?.label ?? "Task";
}

/** Whether `child` may sit directly under `parent` (null: top-level). */
export function fitsUnder(child: TaskTypeValue, parent: TaskTypeValue | null): boolean {
  if (parent === null) return true;
  if (child === "STORY") return parent === "EPIC";
  if (child === "TASK") return parent === "EPIC" || parent === "STORY";
  return false;
}

export interface NestingParent {
  type: TaskTypeValue;
  /** The parent's own parent's type (null when the parent is top-level). */
  parentType: TaskTypeValue | null;
}

export interface NestingChild {
  /** Its type now (an existing task) or the one asked for (a new one). */
  type: TaskTypeValue;
  /** The type was chosen on purpose (a new task's picker, the editor's type). */
  explicit: boolean;
  /** Its subtasks' types, trashed ones included (the database counts them). */
  childTypes: readonly TaskTypeValue[];
}

export type NestingPlan =
  | { ok: true; childType: TaskTypeValue; promoteParent: boolean }
  | { ok: false; error: string };

export const HIERARCHY_ERRORS = {
  taskInStory: "A task inside a story can't be broken down any further.",
  epicInside: "An epic always sits at the top. It can't go inside another task.",
  onlyTasksInStory: "Only tasks go inside a story.",
  storyWithTasks: "It has tasks of its own, so it can only go inside an epic.",
  storyNeedsTop: "A story sits at the top or inside an epic.",
  storiesNeedEpic: "Its stories need an epic above them. Move them out first.",
  hasSubtasks: "It has subtasks (some may be deleted), so it can't be a plain task.",
} as const;

/**
 * Putting a task (new or existing) under a parent. A plain task as the
 * parent becomes a story, unless it is itself inside a story.
 */
export function planNesting(parent: NestingParent, child: NestingChild): NestingPlan {
  let parentType = parent.type;
  let promoteParent = false;
  if (parentType === "TASK") {
    if (parent.parentType === "STORY") return { ok: false, error: HIERARCHY_ERRORS.taskInStory };
    parentType = "STORY";
    promoteParent = true;
  }
  if (parentType === "STORY" && child.type === "STORY" && child.childTypes.length > 0) {
    return { ok: false, error: HIERARCHY_ERRORS.storyWithTasks };
  }
  if (child.type === "EPIC" && (child.explicit || child.childTypes.length > 0)) {
    return { ok: false, error: HIERARCHY_ERRORS.epicInside };
  }

  let childType: TaskTypeValue;
  if (parentType === "EPIC") {
    // An epic holds stories and tasks; an empty epic moved in becomes a story.
    childType = child.type === "EPIC" ? "STORY" : child.type;
  } else {
    if (child.explicit && child.type !== "TASK") {
      return { ok: false, error: HIERARCHY_ERRORS.onlyTasksInStory };
    }
    childType = "TASK";
  }
  if (childType === "TASK" && child.childTypes.length > 0) {
    return { ok: false, error: HIERARCHY_ERRORS.hasSubtasks };
  }
  if (!child.childTypes.every((t) => fitsUnder(t, childType))) {
    return { ok: false, error: HIERARCHY_ERRORS.storiesNeedEpic };
  }
  return { ok: true, childType, promoteParent };
}

/** Changing a task's type where it stands. Null when it fits. */
export function checkTypeChange(
  next: TaskTypeValue,
  where: { parentType: TaskTypeValue | null; childTypes: readonly TaskTypeValue[] },
): string | null {
  if (next === "EPIC" && where.parentType !== null) return HIERARCHY_ERRORS.epicInside;
  if (next === "STORY" && !fitsUnder("STORY", where.parentType)) {
    return HIERARCHY_ERRORS.storyNeedsTop;
  }
  if (next === "TASK" && where.childTypes.length > 0) return HIERARCHY_ERRORS.hasSubtasks;
  if (!where.childTypes.every((t) => fitsUnder(t, next))) return HIERARCHY_ERRORS.storiesNeedEpic;
  return null;
}

/** The types a task may switch to where it stands (for the editor's picker). */
export function allowedTypes(where: {
  parentType: TaskTypeValue | null;
  childTypes: readonly TaskTypeValue[];
}): TaskTypeValue[] {
  return TASK_TYPES.map((t) => t.value).filter((t) => checkTypeChange(t, where) === null);
}

/**
 * Roll-up progress: an epic counts its stories and tasks and the stories'
 * tasks; a story its tasks. Done over all, both levels.
 */
export function rollUp(
  children: readonly { status: string; subtasks?: readonly { status: string }[] }[],
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const c of children) {
    total += 1;
    if (c.status === "COMPLETED") done += 1;
    for (const g of c.subtasks ?? []) {
      total += 1;
      if (g.status === "COMPLETED") done += 1;
    }
  }
  return { done, total };
}

/**
 * Turns the trigger's own refusal ("Task: story can't sit under task") into
 * the sentence the app would have said, for the rare race the pre-checks
 * miss. Null for anything else.
 */
export function hierarchyMessage(raw: string): string | null {
  if (!raw.includes("Task:")) return null;
  if (/its subtasks can't sit under/.test(raw)) return HIERARCHY_ERRORS.storiesNeedEpic;
  const m = /Task: (\w+) can't sit under (\w+)/.exec(raw);
  if (!m) return /own parent/.test(raw) ? "A task can't be its own subtask." : null;
  if (m[1] === "epic") return HIERARCHY_ERRORS.epicInside;
  if (m[1] === "story") return HIERARCHY_ERRORS.storyNeedsTop;
  return HIERARCHY_ERRORS.taskInStory;
}
