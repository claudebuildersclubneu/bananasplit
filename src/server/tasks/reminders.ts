import { TaskStatus } from "@/generated/prisma/client";
import { reminderLeadDaysFor } from "@/lib/notification-prefs";
import {
  addDaysToKey,
  daysBetweenKeys,
  dueDateKey,
  effectiveTimezone,
  zonedInstant,
} from "@/lib/tasks/dates";
import type { TxClient } from "@/server/db/context";
import { enqueueJob } from "@/server/jobs/enqueue";

/**
 * Due-date reminders ('Background jobs' decision, D2).
 *
 * Each recipient gets up to three, all at 09:00 in their zone (User.timezone,
 * else the org's):
 *
 *   upcoming  the lead before the due date (the user's own, else the org
 *             default); none when the lead is 0, since due-today covers it
 *   today     on the due date
 *   overdue   the morning after the due date, once
 *
 * Creating a task, changing its due date, changing its owner, adding a
 * collaborator or reopening it enqueues them in the SAME transaction, keyed
 *
 *   task-reminder:{taskId}:{dueDate}:{userId}           (upcoming)
 *   task-reminder:{taskId}:{dueDate}:{userId}:{stage}   (today, overdue)
 *
 * The task-digest cron also enqueues due-today and overdue reminders for
 * every open task due on the recipient's today or yesterday
 * (./schedule.ts), so tasks that have not changed since these stages
 * existed get them too. The keys are the same, so the two coalesce.
 *
 * Nothing is ever cancelled from the user path (app.cancel_job is admin- and
 * service-only). A superseded job stays PENDING and ends CANCELLED when it
 * runs, because the worker re-checks that the task is open, that its due date
 * still equals the key's date, that the recipient is still its owner (or an
 * assignee who opted in) and that the stage still fits the recipient's local
 * date. Moving a date away and back coalesces into the still-pending job with
 * the same key; once=true refuses a key that already sent (DONE), so each
 * reminder goes out at most once per due date.
 */

export const REMINDER_HOUR_LOCAL = 9;

/** The task-reminder payload's `stage` (src/server/jobs/registry.ts; absent = "upcoming"). */
export type ReminderStage = "upcoming" | "today" | "overdue";

export const REMINDER_STAGES: readonly ReminderStage[] = ["upcoming", "today", "overdue"];

export function reminderKey(
  taskId: string,
  dueKey: string,
  userId: string,
  stage: ReminderStage = "upcoming",
): string {
  const key = `${taskId}:${dueKey}:${userId}`;
  return stage === "upcoming" ? key : `${key}:${stage}`;
}

export function reminderRunAt(dueKey: string, leadDays: number, tz: string): Date {
  return zonedInstant(addDaysToKey(dueKey, -leadDays), REMINDER_HOUR_LOCAL, tz);
}

/** When `stage` goes out, or null when this recipient gets none (an upcoming reminder with no lead). */
export function stageRunAt(
  stage: ReminderStage,
  dueKey: string,
  leadDays: number,
  tz: string,
): Date | null {
  switch (stage) {
    case "upcoming":
      return leadDays > 0 ? reminderRunAt(dueKey, leadDays, tz) : null;
    case "today":
      return reminderRunAt(dueKey, 0, tz);
    case "overdue":
      return reminderRunAt(dueKey, -1, tz);
  }
}

/**
 * Whether `stage` still fits on the recipient's local date `todayKey`. A
 * drain that runs late must not send a stale message: an upcoming reminder
 * that reaches the due date gives way to the due-today one, and a due-today
 * one that slips past midnight gives way to the overdue one.
 */
export function stageApplies(stage: ReminderStage, dueKey: string, todayKey: string): boolean {
  const daysLeft = daysBetweenKeys(todayKey, dueKey);
  if (stage === "upcoming") return daysLeft > 0;
  if (stage === "today") return daysLeft === 0;
  return daysLeft < 0;
}

export interface ReminderTask {
  id: string;
  dueDate: Date | null;
  status: TaskStatus;
}

export interface ReminderOrg {
  id: string;
  timezone: string;
  reminderLeadDaysDefault: number;
}

/** Enqueues one stage for one recipient; returns the job id, or null when once=true refused it. */
export function enqueueReminder(
  db: TxClient,
  orgId: string,
  input: { taskId: string; dueKey: string; userId: string; stage: ReminderStage; runAt: Date },
  options: { noKick?: boolean } = {},
): Promise<string | null> {
  return enqueueJob(db, {
    orgId,
    kind: "task-reminder",
    key: reminderKey(input.taskId, input.dueKey, input.userId, input.stage),
    payload: {
      taskId: input.taskId,
      userId: input.userId,
      dueDate: input.dueKey,
      stage: input.stage,
    },
    runAt: input.runAt,
    once: true,
    noKick: options.noKick,
  });
}

/**
 * Enqueues every stage still ahead for `userIds` on `task`. Skips when there
 * is no due date or the task is completed, and skips each stage whose time
 * has already passed. Returns the number of jobs enqueued.
 */
export async function scheduleTaskReminders(
  db: TxClient,
  org: ReminderOrg,
  task: ReminderTask,
  userIds: readonly string[],
  now: Date = new Date(),
): Promise<number> {
  if (!task.dueDate || task.status === TaskStatus.COMPLETED) return 0;
  const recipients = [...new Set(userIds)];
  if (recipients.length === 0) return 0;
  const dueKey = dueDateKey(task.dueDate);
  const users = await db.user.findMany({
    where: { id: { in: recipients } },
    select: { id: true, timezone: true, emailPreferences: true },
  });
  let n = 0;
  for (const user of users) {
    const tz = effectiveTimezone(user, org);
    const lead = reminderLeadDaysFor(user.emailPreferences, org.reminderLeadDaysDefault);
    for (const stage of REMINDER_STAGES) {
      const runAt = stageRunAt(stage, dueKey, lead, tz);
      if (!runAt || runAt.getTime() < now.getTime()) continue;
      const id = await enqueueReminder(db, org.id, {
        taskId: task.id,
        dueKey,
        userId: user.id,
        stage,
        runAt,
      });
      if (id) n += 1;
    }
  }
  return n;
}
