import { TaskStatus } from "@/generated/prisma/client";
import { parseNotificationPrefs } from "@/lib/notification-prefs";
import {
  addDaysToKey,
  dueDateKey,
  effectiveTimezone,
  fromDateKey,
  localDateKey,
  localHour,
  updateWeekStartKey,
  weekdayOfKey,
  zonedInstant,
} from "@/lib/tasks/dates";
import { withSystemOrgTx } from "@/server/db/context";
import { enqueueJob } from "@/server/jobs/enqueue";

import { enqueueReminder, REMINDER_HOUR_LOCAL, type ReminderStage } from "./reminders";
import { expectedPosters } from "./weekly";

/**
 * Scheduling for the daily digest, the weekly-update reminder and the
 * due-today and overdue reminders, called per org by /api/cron/task-digest.
 * It only enqueues (once=true keys); the jobs do the work.
 *
 * Two trigger modes, both idempotent, so they can run side by side:
 *
 * - hourly (Vercel Pro cron, or the GitHub Actions pinger on Hobby): enqueue
 *   a digest for each opted-in member whose local hour equals their
 *   digest.hourLocal, due now; on the club's update day at 18:00 local, a reminder to each
 *   lead who hasn't posted; and at 09:00 local, the due-today and overdue
 *   reminders for that member's open tasks.
 * - daily (the Hobby daily-cron fallback): enqueue the NEXT occurrence of
 *   each within the coming 24 hours, with runAt at that local time, so the
 *   job drain sends it on time even when nothing calls this hourly.
 *
 * Keys: task-digest:{userId}:{localDate},
 * weekly-update-reminder:{userId}:{weekStart} and the reminder keys of
 * ./reminders.ts (shared with the change-time enqueue, so they coalesce).
 */

export type TriggerMode = "hourly" | "daily";

export const WEEKLY_REMINDER_HOUR_LOCAL = 18;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * When to send an event that happens at `hour` local time on the days
 * accepted by `onDay`, given `now` and the trigger mode. Returns the local
 * date and the run time, or null when nothing is due from this trigger.
 */
export function nextOccurrence(
  now: Date,
  tz: string,
  hour: number,
  mode: TriggerMode,
  onDay: (dateKey: string) => boolean = () => true,
): { dateKey: string; runAt: Date } | null {
  const today = localDateKey(now, tz);
  if (mode === "hourly") {
    if (localHour(now, tz) !== hour || !onDay(today)) return null;
    return { dateKey: today, runAt: now };
  }
  // Daily: the first occurrence from the start of the current hour through the next 24 hours.
  const hourStart = new Date(Math.floor(now.getTime() / HOUR_MS) * HOUR_MS);
  for (const dateKey of [addDaysToKey(today, -1), today, addDaysToKey(today, 1)]) {
    if (!onDay(dateKey)) continue;
    const at = zonedInstant(dateKey, hour, tz);
    if (at.getTime() >= hourStart.getTime() && at.getTime() < now.getTime() + DAY_MS) {
      return { dateKey, runAt: at.getTime() < now.getTime() ? now : at };
    }
  }
  return null;
}

export interface ScheduleSummary {
  digests: number;
  weeklyReminders: number;
  dueReminders: number;
}

/**
 * The reminder a task due on `dueKey` gets on a recipient's local date
 * `dateKey`: due-today on the due date, overdue the day after, else none.
 */
export function sweepStage(dueKey: string, dateKey: string): ReminderStage | null {
  if (dateKey === dueKey) return "today";
  if (dateKey === addDaysToKey(dueKey, 1)) return "overdue";
  return null;
}

export async function scheduleOrgTaskJobs(
  organizationId: string,
  now: Date,
  mode: TriggerMode,
): Promise<ScheduleSummary> {
  return withSystemOrgTx(organizationId, async ({ db }) => {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { timezone: true, deletedAt: true, settings: { select: { weeklyUpdateDay: true } } },
    });
    if (!org || org.deletedAt) return { digests: 0, weeklyReminders: 0, dueReminders: 0 };

    const members = await db.membership.findMany({
      where: { organizationId },
      select: { userId: true, user: { select: { timezone: true, emailPreferences: true } } },
    });

    let digests = 0;
    for (const m of members) {
      const prefs = parseNotificationPrefs(m.user.emailPreferences);
      if (!prefs.digest.enabled) continue;
      const tz = effectiveTimezone(m.user, org);
      const at = nextOccurrence(now, tz, prefs.digest.hourLocal, mode);
      if (!at) continue;
      const id = await enqueueJob(db, {
        orgId: organizationId,
        kind: "task-digest",
        key: `${m.userId}:${at.dateKey}`,
        payload: { userId: m.userId, localDate: at.dateKey },
        runAt: at.runAt,
        once: true,
        noKick: true,
      });
      if (id) digests += 1;
    }

    let weeklyReminders = 0;
    // On the club's update day (Sunday unless it picked another), 6pm local.
    const updateDay = org.settings?.weeklyUpdateDay ?? 0;
    const leads = await expectedPosters(db, organizationId);
    const tzOf = new Map(members.map((m) => [m.userId, effectiveTimezone(m.user, org)]));
    for (const lead of leads) {
      const tz = tzOf.get(lead.userId) ?? effectiveTimezone(null, org);
      const at = nextOccurrence(
        now,
        tz,
        WEEKLY_REMINDER_HOUR_LOCAL,
        mode,
        (d) => weekdayOfKey(d) === updateDay,
      );
      if (!at) continue;
      const weekStart = updateWeekStartKey(new Date(at.runAt.getTime()), tz, updateDay);
      const posted = await db.weeklyUpdate.findFirst({
        where: {
          organizationId,
          userId: lead.userId,
          weekStart: new Date(`${weekStart}T00:00:00.000Z`),
          postedAt: { not: null },
        },
        select: { id: true },
      });
      if (posted) continue;
      const id = await enqueueJob(db, {
        orgId: organizationId,
        kind: "weekly-update-reminder",
        key: `${lead.userId}:${weekStart}`,
        payload: { userId: lead.userId, weekStart },
        runAt: at.runAt,
        once: true,
        noKick: true,
      });
      if (id) weeklyReminders += 1;
    }

    // Due-today and overdue reminders. Changing a task already enqueues
    // them (./reminders.ts); this catches every open task that hasn't
    // changed since, so nobody's reminder depends on an edit. Recipients are
    // the owner and the assignees who opted into collaborator reminders, as
    // in the job itself.
    let dueReminders = 0;
    const reminderAt = new Map<string, { dateKey: string; runAt: Date }>();
    const collaborators = new Set<string>();
    for (const m of members) {
      const at = nextOccurrence(now, effectiveTimezone(m.user, org), REMINDER_HOUR_LOCAL, mode);
      if (at) reminderAt.set(m.userId, at);
      if (parseNotificationPrefs(m.user.emailPreferences).collaboratorReminders) {
        collaborators.add(m.userId);
      }
    }
    const dueKeys = new Set<string>();
    for (const { dateKey } of reminderAt.values()) {
      dueKeys.add(dateKey);
      dueKeys.add(addDaysToKey(dateKey, -1));
    }
    const due =
      dueKeys.size === 0
        ? []
        : await db.task.findMany({
            where: {
              organizationId,
              deletedAt: null,
              status: { not: TaskStatus.COMPLETED },
              dueDate: { in: [...dueKeys].map(fromDateKey) },
            },
            select: { id: true, dueDate: true, ownerId: true, assignees: { select: { userId: true } } },
          });
    for (const task of due) {
      const dueKey = dueDateKey(task.dueDate!);
      const recipients = new Set([
        ...(task.ownerId ? [task.ownerId] : []),
        ...task.assignees.map((a) => a.userId).filter((id) => collaborators.has(id)),
      ]);
      for (const userId of recipients) {
        const at = reminderAt.get(userId); // absent: not a member, or not their hour
        const stage = at ? sweepStage(dueKey, at.dateKey) : null;
        if (!at || !stage) continue;
        const id = await enqueueReminder(
          db,
          organizationId,
          { taskId: task.id, dueKey, userId, stage, runAt: at.runAt },
          { noKick: true },
        );
        if (id) dueReminders += 1;
      }
    }
    return { digests, weeklyReminders, dueReminders };
  });
}
