import { Prisma, TaskStatus } from "@/generated/prisma/client";
import { addDaysToKey, fromDateKey } from "@/lib/tasks/dates";
import { OPEN_STATUSES } from "@/lib/tasks/status";
import type { TxClient } from "@/server/db/context";
import { userPublicSelect } from "@/server/members";

import { tableWhere, type TaskFilters } from "./queries";

/**
 * The task dashboard (?view=dashboard), a layout like the board, week and
 * table, open to everyone: where the tasks in view stand, by epic and by
 * person. It reads the same scope and filters as the other layouts (Mine,
 * My team, Everyone, a person, an epic...) and counts what the board shows
 * (stories and tasks at the top or inside an epic; a story's tasks ride
 * with it), so every figure links to a board or table listing exactly
 * those tasks.
 *
 * Runs on the viewer's ctx.db (withOrgTx): RLS hides private tasks the
 * viewer is not on, so no title or count shows here that the board would not
 * show them. Reads go one after another: a transaction has one connection.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_DAYS = 7;
const ATTENTION_LIMIT = 12;

export interface StatusCounts {
  notStarted: number;
  inProgress: number;
  blocked: number;
  done: number;
  overdue: number;
}

export interface EpicStatus extends StatusCounts {
  epicId: string | null;
  name: string;
  color: string | null;
  /** The epic itself is marked done. */
  finished: boolean;
  total: number;
}

export interface PersonStatus extends StatusCounts {
  userId: string;
  /** Finished in the last week. */
  doneRecently: number;
}

export interface TaskDashboard {
  totals: StatusCounts & {
    open: number;
    dueSoon: number;
    unowned: number;
    doneRecently: number;
  };
  epics: EpicStatus[];
  /** Owners only: a task with no owner counts in `totals.unowned`. */
  people: PersonStatus[];
  /** Blocked or overdue, soonest due first. */
  attention: Prisma.TaskGetPayload<{ select: typeof attentionSelect }>[];
  /** The edges of the windows, as date keys, for the links. */
  window: { todayKey: string; yesterdayKey: string; dueSoonKey: string };
}

const attentionSelect = {
  id: true,
  title: true,
  status: true,
  dueDate: true,
  blockedReason: true,
  priority: true,
  owner: { select: userPublicSelect },
  // Its epic (epicOf): a work item's parent is its epic or nothing.
  parentTask: { select: { id: true, title: true, type: true, color: true } },
} satisfies Prisma.TaskSelect;

const emptyCounts = (): StatusCounts => ({
  notStarted: 0,
  inProgress: 0,
  blocked: 0,
  done: 0,
  overdue: 0,
});

function addStatus(counts: StatusCounts, status: TaskStatus, n: number) {
  if (status === TaskStatus.NOT_STARTED) counts.notStarted += n;
  else if (status === TaskStatus.IN_PROGRESS) counts.inProgress += n;
  else if (status === TaskStatus.BLOCKED) counts.blocked += n;
  else if (status === TaskStatus.COMPLETED) counts.done += n;
}

export async function getTaskDashboard(
  db: TxClient,
  organizationId: string,
  opts: {
    /** The workspace's filters: the scope's people, a person, an epic... */
    filters: TaskFilters;
    /**
     * Whose rows the People table has: the scope's or the filter's people,
     * listed even with nothing on their plate, and only them. Undefined: every
     * owner in view (the client adds the members who own nothing).
     */
    people?: readonly string[];
    todayKey: string;
    now: Date;
  },
): Promise<TaskDashboard> {
  const { todayKey, now } = opts;
  const today = fromDateKey(todayKey);
  const dueSoonKey = addDaysToKey(todayKey, RECENT_DAYS - 1);
  const base = tableWhere(organizationId, opts.filters, today);
  const where = (...and: Prisma.TaskWhereInput[]): Prisma.TaskWhereInput => ({
    AND: [base, ...and],
  });
  const open: Prisma.TaskWhereInput = { status: { in: [...OPEN_STATUSES] } };
  const overdue: Prisma.TaskWhereInput = { ...open, dueDate: { lt: today } };
  const recentlyDone: Prisma.TaskWhereInput = {
    status: TaskStatus.COMPLETED,
    completedAt: { gte: new Date(now.getTime() - RECENT_DAYS * DAY_MS) },
  };

  // A work item's parent is its epic or nothing (tableWhere).
  const byEpicStatus = await db.task.groupBy({
    by: ["parentTaskId", "status"],
    where: where(),
    _count: { _all: true },
  });
  const overdueByEpic = await db.task.groupBy({
    by: ["parentTaskId"],
    where: where(overdue),
    _count: { _all: true },
  });
  const byOwnerStatus = await db.task.groupBy({
    by: ["ownerId", "status"],
    where: where({ ownerId: { not: null } }),
    _count: { _all: true },
  });
  const overdueByOwner = await db.task.groupBy({
    by: ["ownerId"],
    where: where(overdue, { ownerId: { not: null } }),
    _count: { _all: true },
  });
  const doneByOwner = await db.task.groupBy({
    by: ["ownerId"],
    where: where(recentlyDone, { ownerId: { not: null } }),
    _count: { _all: true },
  });
  const dueSoon = await db.task.count({
    where: where(open, { dueDate: { gte: today, lte: fromDateKey(dueSoonKey) } }),
  });
  const unowned = await db.task.count({ where: where(open, { ownerId: null }) });
  const doneRecently = await db.task.count({ where: where(recentlyDone) });
  const attention = await db.task.findMany({
    where: where({ OR: [{ status: TaskStatus.BLOCKED }, overdue] }),
    select: attentionSelect,
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { priority: "desc" }],
    take: ATTENTION_LIMIT,
  });

  // Totals and epics.
  const totals = { ...emptyCounts(), open: 0, dueSoon, unowned, doneRecently };
  const epicCounts = new Map<string | null, StatusCounts>();
  for (const row of byEpicStatus) {
    const counts = epicCounts.get(row.parentTaskId) ?? emptyCounts();
    addStatus(counts, row.status, row._count._all);
    addStatus(totals, row.status, row._count._all);
    epicCounts.set(row.parentTaskId, counts);
  }
  for (const row of overdueByEpic) {
    const counts = epicCounts.get(row.parentTaskId) ?? emptyCounts();
    counts.overdue = row._count._all;
    totals.overdue += row._count._all;
    epicCounts.set(row.parentTaskId, counts);
  }
  totals.open = totals.notStarted + totals.inProgress + totals.blocked;

  const epicIds = [...epicCounts.keys()].filter((id): id is string => id !== null);
  const epicRows =
    epicIds.length > 0
      ? await db.task.findMany({
          where: { organizationId, id: { in: epicIds } },
          select: { id: true, title: true, color: true, status: true },
        })
      : [];
  const epicById = new Map(epicRows.map((e) => [e.id, e]));
  const epics: EpicStatus[] = [...epicCounts.entries()]
    .map(([epicId, counts]) => {
      const epic = epicId ? epicById.get(epicId) : undefined;
      return {
        ...counts,
        epicId,
        name: epicId ? (epic?.title ?? "Epic") : "Not in an epic",
        color: epic?.color ?? null,
        finished: epic?.status === TaskStatus.COMPLETED,
        total: counts.notStarted + counts.inProgress + counts.blocked + counts.done,
      };
    })
    // Live epics with open work first, the loose tasks last.
    .sort(
      (a, b) =>
        Number(a.epicId === null) - Number(b.epicId === null) ||
        Number(a.finished) - Number(b.finished) ||
        b.overdue + b.blocked - (a.overdue + a.blocked) ||
        b.total - b.done - (a.total - a.done) ||
        a.name.localeCompare(b.name),
    );

  // People (owners).
  const personCounts = new Map<string, PersonStatus>();
  const person = (userId: string) => {
    let row = personCounts.get(userId);
    if (!row) {
      row = { ...emptyCounts(), userId, doneRecently: 0 };
      personCounts.set(userId, row);
    }
    return row;
  };
  for (const row of byOwnerStatus) {
    if (row.ownerId) addStatus(person(row.ownerId), row.status, row._count._all);
  }
  for (const row of overdueByOwner) if (row.ownerId) person(row.ownerId).overdue = row._count._all;
  for (const row of doneByOwner)
    if (row.ownerId) person(row.ownerId).doneRecently = row._count._all;
  // The named people are listed even with nothing on their plate, and only
  // they are: a teammate's task can be owned by someone outside the team.
  const team = opts.people ? new Set(opts.people) : null;
  for (const id of opts.people ?? []) person(id);

  return {
    totals,
    epics,
    people: [...personCounts.values()].filter((p) => !team || team.has(p.userId)),
    attention,
    window: {
      todayKey,
      yesterdayKey: addDaysToKey(todayKey, -1),
      dueSoonKey,
    },
  };
}
