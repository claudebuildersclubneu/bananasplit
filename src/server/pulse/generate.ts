import { TaskStatus, TaskType } from "@/generated/prisma/client";
import { epicOf } from "@/lib/tasks/epic";
import type { PulseIssueData } from "@/lib/pulse/data";
import {
  addDaysToKey,
  dueDateKey,
  fromDateKey,
  localDateKey,
  zonedInstant,
} from "@/lib/tasks/dates";
import type { TxClient } from "@/server/db/context";

/**
 * Compiling one week's pulse (PulseIssueData v1) for a club.
 *
 * The week is the seven org-local days ending on OrgSettings.pulseDay
 * (updateWeekStartOfKey, as the weekly update counts weeks): `from` is the
 * first of them, `to` the send day. Everything is read on the service path
 * (withSystemOrgTx, by the pulse job and the scheduler), so the reads keep
 * to what every member may see: ORG tasks only (a private task's title
 * never reaches an issue), live events, member names.
 *
 * collectPulseRaw does the bounded reads; shapePulseData turns them into
 * the stored shape and is pure, so the rules are unit-tested on a fixture
 * week (generate.test.ts).
 */

export interface PulseRange {
  from: string;
  to: string;
}

export interface PulseRaw {
  range: PulseRange;
  /** The club's live epics (they took over from projects). */
  epics: { id: string; name: string; color: string | null }[];
  /** ORG tasks completed in the range (epics, stories and tasks), with the epic each is in. */
  done: {
    id: string;
    type: TaskType;
    title: string;
    epicId: string | null;
  }[];
  /** Open ORG stories and tasks at compile time, per epic (null: outside one). */
  openByEpic: { epicId: string | null; open: number }[];
  events: { id: string; title: string; startsAt: Date; checkIns: number }[];
  members: { userId: string; name: string | null; joinedAt: Date }[];
  signups: { contactId: string; name: string | null; joinedAt: Date }[];
  polls: {
    kind: "poll" | "ballot";
    id: string;
    question: string;
    totalVotes: number;
    options: { label: string; votes: number }[];
  }[];
  dueNext: { id: string; title: string; dueDate: Date; ownerId: string | null }[];
  eventsNext: { id: string; title: string; startsAt: Date }[];
  /** The club's zone, for event dates. */
  timeZone: string;
}

const MAX_EVENTS = 8;
const MAX_NEW_MEMBERS = 12;
const MAX_POLLS = 5;
const MAX_OPTIONS = 4;
const MAX_NEXT = 8;
const MAX_EPICS = 6;

/** The stored shape from the raw reads. Pure. */
export function shapePulseData(raw: PulseRaw): PulseIssueData {
  // Work done per epic (an epic's own completion counts in the epics
  // finished, not here).
  const doneBy = new Map<string | null, number>();
  for (const t of raw.done) {
    if (t.type === TaskType.EPIC) continue;
    doneBy.set(t.epicId, (doneBy.get(t.epicId) ?? 0) + 1);
  }
  const openBy = new Map(raw.openByEpic.map((p) => [p.epicId, p.open]));

  // Stored as byProject (the issue's shape predates epics taking over);
  // each line is an epic now.
  const byProject: PulseIssueData["byProject"] = [];
  for (const p of [...raw.epics].sort((a, b) => a.name.localeCompare(b.name))) {
    const done = doneBy.get(p.id) ?? 0;
    const open = openBy.get(p.id) ?? 0;
    if (done || open) byProject.push({ projectId: p.id, name: p.name, color: p.color, done, open });
  }
  const looseDone = doneBy.get(null) ?? 0;
  const looseOpen = openBy.get(null) ?? 0;
  if (looseDone || looseOpen) {
    byProject.push({
      projectId: null,
      name: "Not in an epic",
      color: null,
      done: looseDone,
      open: looseOpen,
    });
  }

  const newMembers: PulseIssueData["newMembers"] = [
    ...raw.members.map((m) => ({
      userId: m.userId,
      contactId: null,
      name: m.name?.trim() || "New member",
      joinedAt: m.joinedAt.toISOString(),
    })),
    ...raw.signups.map((s) => ({
      userId: null,
      contactId: s.contactId,
      name: s.name?.trim() || "New member",
      joinedAt: s.joinedAt.toISOString(),
    })),
  ]
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
    .slice(0, MAX_NEW_MEMBERS);

  const nextFrom = addDaysToKey(raw.range.to, 1);
  const nextTo = addDaysToKey(raw.range.to, 7);
  const nextWeek: PulseIssueData["nextWeek"] = [
    ...raw.dueNext.map((t) => ({
      kind: "task" as const,
      id: t.id,
      title: t.title,
      date: dueDateKey(t.dueDate),
      ownerId: t.ownerId,
    })),
    ...raw.eventsNext.map((e) => ({
      kind: "event" as const,
      id: e.id,
      title: e.title,
      date: localDateKey(e.startsAt, raw.timeZone),
      ownerId: null,
    })),
  ]
    .filter((item) => item.date >= nextFrom && item.date <= nextTo)
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
    .slice(0, MAX_NEXT);

  return {
    v: 1,
    range: raw.range,
    doneCount: raw.done.length,
    byProject,
    epicsFinished: raw.done
      .filter((t) => t.type === TaskType.EPIC)
      .slice(0, MAX_EPICS)
      .map((t) => ({
        id: t.id,
        title: t.title,
        project: null,
      })),
    events: [...raw.events]
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .slice(0, MAX_EVENTS)
      .map((e) => ({
        eventId: e.id,
        title: e.title,
        startsAt: e.startsAt.toISOString(),
        checkIns: e.checkIns,
      })),
    newMembers,
    pollResults: raw.polls.slice(0, MAX_POLLS).map((p) => ({
      kind: p.kind,
      pollId: p.id,
      question: p.question,
      totalVotes: p.totalVotes,
      options: [...p.options].sort((a, b) => b.votes - a.votes).slice(0, MAX_OPTIONS),
    })),
    nextWeek,
  };
}

/** [start, end) instants of the range in `tz`, the end cut at `now` (nothing from the future). */
export function rangeInstants(
  range: PulseRange,
  tz: string,
  now: Date,
): { start: Date; end: Date } {
  const start = zonedInstant(range.from, 0, tz);
  const end = zonedInstant(addDaysToKey(range.to, 1), 0, tz);
  return { start, end: end.getTime() > now.getTime() ? now : end };
}

type BallotQuestion = { key: string; label?: string; options?: { key: string; label?: string }[] };

/** The bounded reads for one week, one after another on the caller's (service) transaction. */
export async function collectPulseRaw(
  db: TxClient,
  organizationId: string,
  range: PulseRange,
  timeZone: string,
  now: Date,
): Promise<PulseRaw> {
  const { start, end } = rangeInstants(range, timeZone, now);
  const live = { organizationId, deletedAt: null, visibility: "ORG" as const };

  const epics = (
    await db.task.findMany({
      where: { ...live, type: TaskType.EPIC, status: { not: TaskStatus.COMPLETED } },
      select: { id: true, title: true, color: true },
      take: 200,
    })
  ).map((e) => ({ id: e.id, name: e.title, color: e.color }));
  const chain = {
    id: true,
    type: true,
    title: true,
    parentTask: {
      select: {
        id: true,
        type: true,
        title: true,
        parentTask: { select: { id: true, type: true, title: true } },
      },
    },
  } as const;
  const doneRows = await db.task.findMany({
    where: { ...live, status: TaskStatus.COMPLETED, completedAt: { gte: start, lt: end } },
    select: chain,
    orderBy: { completedAt: "asc" },
    take: 2000,
  });
  const done = doneRows.map((t) => ({
    id: t.id,
    type: t.type,
    title: t.title,
    epicId: epicOf(t)?.id ?? null,
  }));
  const openRows = await db.task.findMany({
    where: { ...live, type: { not: TaskType.EPIC }, status: { not: TaskStatus.COMPLETED } },
    select: chain,
    take: 5000,
  });
  const openCount = new Map<string | null, number>();
  for (const t of openRows) {
    const id = epicOf(t)?.id ?? null;
    openCount.set(id, (openCount.get(id) ?? 0) + 1);
  }

  const events = await db.event.findMany({
    where: {
      organizationId,
      deletedAt: null,
      mergedIntoId: null,
      startsAt: { gte: start, lt: end },
    },
    select: {
      id: true,
      title: true,
      startsAt: true,
      attendanceCount: true,
      _count: { select: { attendance: true } },
    },
    orderBy: { startsAt: "asc" },
    take: MAX_EVENTS,
  });

  const members = await db.membership.findMany({
    where: { organizationId, joinedAt: { gte: start, lt: end } },
    select: { userId: true, joinedAt: true, user: { select: { name: true } } },
    orderBy: { joinedAt: "asc" },
    take: MAX_NEW_MEMBERS,
  });
  const signups = await db.signup.findMany({
    where: { organizationId, signedUpAt: { gte: start, lt: end } },
    select: { contactId: true, signedUpAt: true, contact: { select: { displayName: true } } },
    orderBy: { signedUpAt: "asc" },
    take: MAX_NEW_MEMBERS,
  });

  // Decisions: question polls that closed in the week (by hand or on time),
  // and website ballots that closed in it or drew votes in it.
  const polls: PulseRaw["polls"] = [];
  const closed = await db.poll.findMany({
    where: {
      organizationId,
      OR: [
        { closedAt: { gte: start, lt: end } },
        { closedAt: null, closesAt: { gte: start, lt: end } },
      ],
    },
    select: { id: true, question: true, options: { select: { id: true, label: true } } },
    orderBy: { createdAt: "asc" },
    take: MAX_POLLS,
  });
  for (const poll of closed) {
    const counts = await db.pollVote.groupBy({
      by: ["optionId"],
      where: { organizationId, pollId: poll.id },
      _count: { _all: true },
    });
    const voters = await db.pollVote.findMany({
      where: { organizationId, pollId: poll.id },
      distinct: ["userId"],
      select: { userId: true },
      take: 5000,
    });
    const votesOf = new Map(counts.map((c) => [c.optionId, c._count._all]));
    polls.push({
      kind: "poll",
      id: poll.id,
      question: poll.question,
      totalVotes: voters.length,
      options: poll.options.map((o) => ({ label: o.label, votes: votesOf.get(o.id) ?? 0 })),
    });
  }
  const ballots = await db.ballotDefinition.findMany({
    where: {
      organizationId,
      isTest: false,
      OR: [
        { closesAt: { gte: start, lt: end } },
        { ballots: { some: { castAt: { gte: start, lt: end } } } },
      ],
    },
    select: { id: true, title: true, definition: true },
    take: MAX_POLLS,
  });
  for (const b of ballots) {
    const question = (b.definition as { questions?: BallotQuestion[] } | null)?.questions?.[0];
    if (!question) continue;
    const where = { organizationId, ballotDefinitionId: b.id };
    const choices = await db.ballotChoice.groupBy({
      by: ["choiceKey"],
      where: { ...where, questionKey: question.key },
      _count: { _all: true },
    });
    const labelOf = (key: string) => question.options?.find((o) => o.key === key)?.label ?? key;
    polls.push({
      kind: "ballot",
      id: b.id,
      question: question.label ?? b.title,
      totalVotes: await db.ballot.count({ where: { ...where, excludedReason: null } }),
      options: choices
        .filter((c) => c.choiceKey)
        .map((c) => ({ label: labelOf(c.choiceKey!), votes: c._count._all })),
    });
  }

  const nextFrom = addDaysToKey(range.to, 1);
  const nextEnd = addDaysToKey(range.to, 8);
  const dueNext = await db.task.findMany({
    where: {
      ...live,
      status: { not: TaskStatus.COMPLETED },
      dueDate: { gte: fromDateKey(nextFrom), lt: fromDateKey(nextEnd) },
    },
    select: { id: true, title: true, dueDate: true, ownerId: true },
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
    take: MAX_NEXT,
  });
  const eventsNext = await db.event.findMany({
    where: {
      organizationId,
      deletedAt: null,
      mergedIntoId: null,
      startsAt: {
        gte: zonedInstant(nextFrom, 0, timeZone),
        lt: zonedInstant(nextEnd, 0, timeZone),
      },
    },
    select: { id: true, title: true, startsAt: true },
    orderBy: { startsAt: "asc" },
    take: MAX_NEXT,
  });

  return {
    range,
    timeZone,
    epics,
    done,
    openByEpic: [...openCount].map(([epicId, open]) => ({ epicId, open })),
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      startsAt: e.startsAt,
      checkIns: Math.max(e._count.attendance, e.attendanceCount),
    })),
    members: members.map((m) => ({ userId: m.userId, name: m.user.name, joinedAt: m.joinedAt })),
    signups: signups.map((s) => ({
      contactId: s.contactId,
      name: s.contact.displayName,
      joinedAt: s.signedUpAt,
    })),
    polls,
    dueNext: dueNext.filter((t): t is typeof t & { dueDate: Date } => t.dueDate !== null),
    eventsNext,
  };
}

/** One week's pulse data, read and shaped. */
export async function compilePulseData(
  db: TxClient,
  organizationId: string,
  range: PulseRange,
  timeZone: string,
  now: Date,
): Promise<PulseIssueData> {
  return shapePulseData(await collectPulseRaw(db, organizationId, range, timeZone, now));
}
