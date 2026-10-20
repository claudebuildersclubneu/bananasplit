import { beforeEach, describe, expect, it, vi } from "vitest";

import { fromDateKey, weekdayOfKey, zonedInstant } from "@/lib/tasks/dates";
import { withSystemOrgTx } from "@/server/db/context";
import { enqueueJob } from "@/server/jobs/enqueue";

vi.mock("@/server/db/context", () => ({ withSystemOrgTx: vi.fn() }));
vi.mock("@/server/jobs/enqueue", () => ({ enqueueJob: vi.fn() }));
vi.mock("./weekly", () => ({ expectedPosters: vi.fn(async () => []) }));

const { nextOccurrence, scheduleOrgTaskJobs, sweepStage } = await import("./schedule");
const { reminderKey, reminderRunAt, scheduleTaskReminders, stageApplies, stageRunAt } =
  await import("./reminders");
const { dueWhen } = await import("./email");

const NY = "America/New_York";

beforeEach(() => {
  vi.mocked(enqueueJob).mockReset().mockResolvedValue("job");
});

/** The (key, stage, runAt) of every reminder enqueued so far. */
function enqueuedReminders() {
  return vi
    .mocked(enqueueJob)
    .mock.calls.map(([, input]) => input)
    .filter((input) => input.kind === "task-reminder")
    .map((input) => ({
      key: input.key,
      stage: (input.payload as { stage?: string }).stage,
      runAt: input.runAt?.toISOString(),
    }));
}

describe("digest and Sunday-reminder triggers", () => {
  it("hourly: only in the member's digest hour, due now", () => {
    const at8 = zonedInstant("2026-10-01", 8, NY);
    const at8late = new Date(at8.getTime() + 45 * 60_000);
    expect(nextOccurrence(at8, NY, 8, "hourly")).toEqual({ dateKey: "2026-10-01", runAt: at8 });
    expect(nextOccurrence(at8late, NY, 8, "hourly")?.dateKey).toBe("2026-10-01");
    expect(nextOccurrence(zonedInstant("2026-10-01", 7, NY), NY, 8, "hourly")).toBeNull();
    expect(nextOccurrence(zonedInstant("2026-10-01", 9, NY), NY, 8, "hourly")).toBeNull();
  });

  it("daily fallback: schedules the next occurrence within 24 hours at the local hour", () => {
    // A daily cron at 10:00 UTC (06:00 New York) schedules today's 08:00.
    const cron = new Date("2026-10-01T10:00:00Z");
    expect(nextOccurrence(cron, NY, 8, "daily")).toEqual({
      dateKey: "2026-10-01",
      runAt: zonedInstant("2026-10-01", 8, NY),
    });
    // After the hour has passed, it schedules tomorrow's.
    const late = new Date("2026-10-01T15:00:00Z");
    expect(nextOccurrence(late, NY, 8, "daily")?.dateKey).toBe("2026-10-02");
  });

  it("keys digests per local date across the DST change", () => {
    // Nov 1 2026: clocks fall back in New York. 08:00 EST is 13:00 UTC.
    const fallBack = zonedInstant("2026-11-01", 8, NY);
    expect(fallBack.toISOString()).toBe("2026-11-01T13:00:00.000Z");
    expect(nextOccurrence(fallBack, NY, 8, "hourly")?.dateKey).toBe("2026-11-01");
    // The day before, 08:00 EDT is 12:00 UTC; 13:00 UTC is 09:00 then, not the digest hour.
    expect(nextOccurrence(new Date("2026-10-31T13:00:00Z"), NY, 8, "hourly")).toBeNull();
  });

  it("the Sunday reminder fires only on Sunday at 18:00 local", () => {
    const sunday = (d: string) => weekdayOfKey(d) === 0;
    expect(
      nextOccurrence(zonedInstant("2026-09-27", 18, NY), NY, 18, "hourly", sunday)?.dateKey,
    ).toBe("2026-09-27");
    expect(nextOccurrence(zonedInstant("2026-09-26", 18, NY), NY, 18, "hourly", sunday)).toBeNull();
    // The daily fallback on Sunday morning schedules the evening reminder.
    expect(nextOccurrence(zonedInstant("2026-09-27", 6, NY), NY, 18, "daily", sunday)).toEqual({
      dateKey: "2026-09-27",
      runAt: zonedInstant("2026-09-27", 18, NY),
    });
  });
});

describe("reminder keys and times", () => {
  it("keys on task, due date and recipient", () => {
    expect(reminderKey("t1", "2026-10-03", "u1")).toBe("t1:2026-10-03:u1");
  });

  it("keeps the original key for the upcoming stage and suffixes the others", () => {
    expect(reminderKey("t1", "2026-10-03", "u1", "upcoming")).toBe("t1:2026-10-03:u1");
    expect(reminderKey("t1", "2026-10-03", "u1", "today")).toBe("t1:2026-10-03:u1:today");
    expect(reminderKey("t1", "2026-10-03", "u1", "overdue")).toBe("t1:2026-10-03:u1:overdue");
  });

  it("times each stage at 09:00 local: the lead before, the due date, the day after", () => {
    expect(stageRunAt("upcoming", "2026-10-03", 2, NY)?.toISOString()).toBe(
      "2026-10-01T13:00:00.000Z",
    );
    expect(stageRunAt("today", "2026-10-03", 2, NY)?.toISOString()).toBe(
      "2026-10-03T13:00:00.000Z",
    );
    expect(stageRunAt("overdue", "2026-10-03", 2, NY)?.toISOString()).toBe(
      "2026-10-04T13:00:00.000Z",
    );
    // No lead: the due-today reminder is the only one on the day.
    expect(stageRunAt("upcoming", "2026-10-03", 0, NY)).toBeNull();
  });

  it("drops a stage that would arrive too late to be true", () => {
    expect(stageApplies("upcoming", "2026-10-03", "2026-10-02")).toBe(true);
    expect(stageApplies("upcoming", "2026-10-03", "2026-10-03")).toBe(false);
    expect(stageApplies("today", "2026-10-03", "2026-10-03")).toBe(true);
    expect(stageApplies("today", "2026-10-03", "2026-10-04")).toBe(false);
    expect(stageApplies("overdue", "2026-10-03", "2026-10-03")).toBe(false);
    expect(stageApplies("overdue", "2026-10-03", "2026-10-06")).toBe(true);
  });

  it("the sweep picks due-today on the due date and overdue the day after", () => {
    expect(sweepStage("2026-10-03", "2026-10-03")).toBe("today");
    expect(sweepStage("2026-10-03", "2026-10-04")).toBe("overdue");
    expect(sweepStage("2026-10-03", "2026-10-05")).toBeNull();
    expect(sweepStage("2026-10-03", "2026-10-02")).toBeNull();
  });

  it("runs at 09:00 local, lead days before the due date", () => {
    expect(reminderRunAt("2026-10-03", 1, NY).toISOString()).toBe("2026-10-02T13:00:00.000Z");
    expect(reminderRunAt("2026-11-03", 2, NY).toISOString()).toBe("2026-11-01T14:00:00.000Z");
    expect(reminderRunAt("2026-10-03", 0, "UTC").toISOString()).toBe("2026-10-03T09:00:00.000Z");
  });

  it("says when it's due", () => {
    expect(dueWhen("2026-10-02", "2026-10-03")).toBe("tomorrow");
    expect(dueWhen("2026-10-03", "2026-10-03")).toBe("today");
    expect(dueWhen("2026-10-01", "2026-10-04")).toBe("in 3 days");
    expect(dueWhen("2026-10-04", "2026-10-03")).toBe("yesterday (overdue)");
  });
});

describe("scheduleTaskReminders (change-time)", () => {
  const org = { id: "org1", timezone: NY, reminderLeadDaysDefault: 1 };
  const task = { id: "t1", dueDate: fromDateKey("2026-10-16"), status: "NOT_STARTED" as const };
  const db = (users: { id: string; emailPreferences: unknown }[]) =>
    ({
      user: { findMany: vi.fn(async () => users.map((u) => ({ timezone: null, ...u }))) },
    }) as never;

  it("enqueues every stage still ahead: the lead reminder, due today and overdue", async () => {
    const n = await scheduleTaskReminders(
      db([{ id: "u1", emailPreferences: {} }]),
      org,
      task,
      ["u1"],
      new Date("2026-10-14T10:00:00Z"),
    );
    expect(n).toBe(3);
    expect(enqueuedReminders()).toEqual([
      { key: "t1:2026-10-16:u1", stage: "upcoming", runAt: "2026-10-15T13:00:00.000Z" },
      { key: "t1:2026-10-16:u1:today", stage: "today", runAt: "2026-10-16T13:00:00.000Z" },
      { key: "t1:2026-10-16:u1:overdue", stage: "overdue", runAt: "2026-10-17T13:00:00.000Z" },
    ]);
  });

  it("with a lead of 0 there is no separate upcoming reminder", async () => {
    const lead0 = {
      v: 2,
      types: {},
      digest: { enabled: false, hourLocal: 8 },
      reminderLeadDays: 0,
      collaboratorReminders: false,
    };
    await scheduleTaskReminders(
      db([{ id: "u1", emailPreferences: lead0 }]),
      org,
      task,
      ["u1"],
      new Date("2026-10-14T10:00:00Z"),
    );
    expect(enqueuedReminders().map((r) => r.stage)).toEqual(["today", "overdue"]);
  });

  it("skips the stages already past, and everything for a completed task", async () => {
    await scheduleTaskReminders(
      db([{ id: "u1", emailPreferences: {} }]),
      org,
      task,
      ["u1"],
      new Date("2026-10-16T15:00:00Z"),
    );
    expect(enqueuedReminders().map((r) => r.stage)).toEqual(["overdue"]);
    expect(await scheduleTaskReminders(db([]), org, { ...task, status: "COMPLETED" }, ["u1"])).toBe(
      0,
    );
  });
});

describe("scheduleOrgTaskJobs: the due-today and overdue sweep", () => {
  const optedIn = {
    v: 2,
    types: {},
    digest: { enabled: false, hourLocal: 8 },
    reminderLeadDays: 1,
    collaboratorReminders: true,
  };
  const members = [
    { userId: "owner", user: { timezone: null, emailPreferences: {} } },
    { userId: "collab", user: { timezone: null, emailPreferences: optedIn } },
    { userId: "quiet", user: { timezone: null, emailPreferences: {} } },
  ];
  const tasks = [
    {
      id: "dueToday",
      dueDate: fromDateKey("2026-10-14"),
      ownerId: "owner",
      assignees: [{ userId: "collab" }, { userId: "quiet" }],
    },
    { id: "lateOne", dueDate: fromDateKey("2026-10-13"), ownerId: "owner", assignees: [] },
    { id: "leftOrg", dueDate: fromDateKey("2026-10-14"), ownerId: "gone", assignees: [] },
  ];
  const findTasks = vi.fn(async () => tasks);
  const db = {
    organization: { findUnique: vi.fn(async () => ({ timezone: NY, deletedAt: null })) },
    membership: { findMany: vi.fn(async () => members) },
    task: { findMany: findTasks },
  };

  beforeEach(() => {
    vi.mocked(withSystemOrgTx).mockImplementation((async (
      _orgId: string,
      fn: (ctx: unknown) => unknown,
    ) => fn({ db })) as never);
  });

  it("the daily fallback schedules today's 09:00 for the owner and opted-in collaborators", async () => {
    const summary = await scheduleOrgTaskJobs("org1", new Date("2026-10-14T10:00:00Z"), "daily");
    const at9 = zonedInstant("2026-10-14", 9, NY).toISOString();
    expect(enqueuedReminders()).toEqual([
      { key: "dueToday:2026-10-14:owner:today", stage: "today", runAt: at9 },
      { key: "dueToday:2026-10-14:collab:today", stage: "today", runAt: at9 },
      { key: "lateOne:2026-10-13:owner:overdue", stage: "overdue", runAt: at9 },
    ]);
    expect(summary).toEqual({ digests: 0, weeklyReminders: 0, dueReminders: 3 });
    // Only open tasks due on the local today or yesterday are read.
    expect(findTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { not: "COMPLETED" },
          deletedAt: null,
          dueDate: { in: [fromDateKey("2026-10-14"), fromDateKey("2026-10-13")] },
        }),
      }),
    );
  });

  it("the hourly trigger sends nothing outside the 09:00 hour", async () => {
    await scheduleOrgTaskJobs("org1", zonedInstant("2026-10-14", 11, NY), "hourly");
    expect(enqueuedReminders()).toEqual([]);
  });
});
