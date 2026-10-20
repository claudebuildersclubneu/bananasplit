import { TaskStatus } from "@/generated/prisma/client";
import { parsePulseData, type PulseIssueData } from "@/lib/pulse/data";
import { addDaysToKey, dueDateKey, localDateKey, zonedInstant } from "@/lib/tasks/dates";
import type { TxClient } from "@/server/db/context";

import { pulseWeekStartHolding, upcomingPulseSend } from "./schedule";

/**
 * Reading the pulse as a member (withOrgTx: RLS lets members read their
 * club's issues; only OWNER/ADMIN may change the note). Drafts (sentAt
 * NULL) are for admins: members see an issue once it went out.
 */

export interface PulseIssueView {
  id: string;
  weekStart: string;
  data: PulseIssueData;
  note: string | null;
  sentAt: Date | null;
}

const ARCHIVE_LIMIT = 104;

function toView(row: {
  id: string;
  weekStart: Date;
  data: unknown;
  note: string | null;
  sentAt: Date | null;
}): PulseIssueView | null {
  const data = parsePulseData(row.data);
  return data
    ? { id: row.id, weekStart: dueDateKey(row.weekStart), data, note: row.note, sentAt: row.sentAt }
    : null;
}

const issueSelect = { id: true, weekStart: true, data: true, note: true, sentAt: true } as const;

/** The archive, newest week first. */
export async function listPulseIssues(
  db: TxClient,
  organizationId: string,
  opts: { drafts: boolean },
): Promise<PulseIssueView[]> {
  const rows = await db.pulseIssue.findMany({
    where: { organizationId, ...(opts.drafts ? {} : { sentAt: { not: null } }) },
    select: issueSelect,
    orderBy: { weekStart: "desc" },
    take: ARCHIVE_LIMIT,
  });
  return rows.map(toView).filter((v): v is PulseIssueView => v !== null);
}

export async function getPulseIssue(
  db: TxClient,
  organizationId: string,
  weekStart: string,
  opts: { drafts: boolean },
): Promise<PulseIssueView | null> {
  const row = await db.pulseIssue.findUnique({
    where: {
      organizationId_weekStart: { organizationId, weekStart: new Date(`${weekStart}T00:00:00.000Z`) },
    },
    select: issueSelect,
  });
  if (!row || (!row.sentAt && !opts.drafts)) return null;
  return toView(row);
}

/** The latest issue that went out (the Overview card), or null. */
export async function latestSentPulse(
  db: TxClient,
  organizationId: string,
): Promise<PulseIssueView | null> {
  const row = await db.pulseIssue.findFirst({
    where: { organizationId, sentAt: { not: null } },
    select: issueSelect,
    orderBy: { weekStart: "desc" },
  });
  return row ? toView(row) : null;
}

export interface TrendWeek {
  weekStart: string;
  /** "Oct 5". */
  label: string;
  done: number;
}

const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/**
 * Tasks finished per pulse week for the last `weeks` weeks, the current
 * (unfinished) week last. Read as the member, so it counts what they can see.
 */
export async function weeklyDoneTrend(
  db: TxClient,
  organizationId: string,
  opts: { timeZone: string; pulseDay: number; now: Date; weeks?: number },
): Promise<TrendWeek[]> {
  const weeks = opts.weeks ?? 8;
  const current = pulseWeekStartHolding(localDateKey(opts.now, opts.timeZone), opts.pulseDay);
  const first = addDaysToKey(current, -7 * (weeks - 1));
  const rows = await db.task.findMany({
    where: {
      organizationId,
      deletedAt: null,
      status: TaskStatus.COMPLETED,
      completedAt: { gte: zonedInstant(first, 0, opts.timeZone) },
    },
    select: { completedAt: true },
    take: 10_000,
  });
  const out: TrendWeek[] = Array.from({ length: weeks }, (_, i) => {
    const weekStart = addDaysToKey(first, 7 * i);
    return { weekStart, label: SHORT.format(new Date(`${weekStart}T00:00:00Z`)), done: 0 };
  });
  for (const row of rows) {
    if (!row.completedAt) continue;
    const week = pulseWeekStartHolding(localDateKey(row.completedAt, opts.timeZone), opts.pulseDay);
    const slot = out.find((w) => w.weekStart === week);
    if (slot) slot.done += 1;
  }
  return out;
}

/** When the next pulse goes out ("Fri, Oct 23 at 5:00 PM"), for the card and the archive. */
export function nextPulseLabel(now: Date, timeZone: string, pulseDay: number, hour: number): string {
  const { at } = upcomingPulseSend(now, timeZone, pulseDay, hour);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  })
    .format(at)
    .replace(/, (\d+:\d\d)/, " at $1");
}
