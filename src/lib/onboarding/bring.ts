/**
 * "Bring anything in?" (club setup's last step, and Move to a club): the
 * Personal items as the checklist shows them. Pure and client-safe: the
 * page shapes the server's lists into sections here (dates in the Personal
 * space's time zone, so the server and the browser agree), and the form
 * turns the ticked ids back into the move's selection.
 */

export type BringKind = "event" | "poll" | "question" | "task";

export interface BringItem {
  id: string;
  kind: BringKind;
  title: string;
  /** One quiet line: when, how many responded, what comes along. */
  meta: string;
}

export interface BringGroup {
  /** A Personal project's name; null for no heading. */
  label: string | null;
  items: BringItem[];
}

export interface BringSection {
  key: "rsvp" | "events" | "polls" | "tasks";
  title: string;
  groups: BringGroup[];
}

export interface BringSelection {
  eventIds: string[];
  pollIds: string[];
  questionPollIds: string[];
  taskIds: string[];
}

interface EventIn {
  id: string;
  title: string;
  startsAt: Date;
  allDay: boolean;
  rsvp: boolean;
  going: number;
  past: boolean;
}
interface PollIn {
  id: string;
  title: string;
  kind: "availability" | "question";
  responses: number;
  finalizedEventId: string | null;
}
interface TaskIn {
  id: string;
  title: string;
  dueDate: Date | null;
  subtasks: number;
}

export interface BringableIn {
  space: { timezone: string };
  rsvpEvents: EventIn[];
  events: EventIn[];
  polls: PollIn[];
  taskGroups: { project: string | null; tasks: TaskIn[] }[];
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function when(e: EventIn, timeZone: string): string {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(e.startsAt);
  if (e.allDay) return day;
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(e.startsAt);
  return `${day}, ${time}`;
}

function eventItem(e: EventIn, timeZone: string): BringItem {
  const parts = [when(e, timeZone)];
  if (e.rsvp) parts.push(`${e.going} going`);
  if (e.past) parts.push("past");
  return { id: e.id, kind: "event", title: e.title, meta: parts.join(" · ") };
}

function pollItem(p: PollIn): BringItem {
  if (p.kind === "question") {
    return {
      id: p.id,
      kind: "question",
      title: p.title,
      meta: `Question poll · ${plural(p.responses, "vote")}`,
    };
  }
  const parts = ["Availability poll", plural(p.responses, "response")];
  if (p.finalizedEventId) parts.push("its event comes too");
  return { id: p.id, kind: "poll", title: p.title, meta: parts.join(" · ") };
}

function taskItem(t: TaskIn, timeZone: string): BringItem {
  const parts: string[] = [];
  if (t.dueDate) {
    parts.push(
      `Due ${new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(t.dueDate)}`,
    );
  }
  if (t.subtasks)
    parts.push(`${plural(t.subtasks, "subtask")} come${t.subtasks === 1 ? "s" : ""} too`);
  return { id: t.id, kind: "task", title: t.title, meta: parts.join(" · ") || "No due date" };
}

/** The checklist's sections, in order; empty ones are left out. */
export function bringSections(b: BringableIn): BringSection[] {
  const tz = b.space.timezone;
  const sections: BringSection[] = [
    {
      key: "rsvp",
      title: "Event pages",
      groups: [{ label: null, items: b.rsvpEvents.map((e) => eventItem(e, tz)) }],
    },
    {
      key: "events",
      title: "Calendar events",
      groups: [{ label: null, items: b.events.map((e) => eventItem(e, tz)) }],
    },
    { key: "polls", title: "Polls", groups: [{ label: null, items: b.polls.map(pollItem) }] },
    {
      key: "tasks",
      title: "Open tasks",
      groups: b.taskGroups.map((g) => ({
        label: g.project,
        items: g.tasks.map((t) => taskItem(t, tz)),
      })),
    },
  ];
  return sections.filter((s) => s.groups.some((g) => g.items.length > 0));
}

/** The ticked ids, split by kind for the move. */
export function bringSelection(items: BringItem[], ticked: ReadonlySet<string>): BringSelection {
  const pick = (kind: BringKind) =>
    items.filter((i) => i.kind === kind && ticked.has(i.id)).map((i) => i.id);
  return {
    eventIds: pick("event"),
    pollIds: pick("poll"),
    questionPollIds: pick("question"),
    taskIds: pick("task"),
  };
}

/** "Move 3 items into Chess Club". */
export function moveLabel(count: number, clubName: string): string {
  return `Move ${plural(count, "item")} into ${clubName}`;
}
