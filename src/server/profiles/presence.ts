import { cellKey, FIRST_HOUR, LAST_HOUR } from "@/lib/availability";

/**
 * "Free now", from the busy hours a member already shares (the "d-h"
 * cells of a typical week in their own time zone, Monday = 0). Pure.
 *
 * A member counts as free when the viewer may see their busy hours, they
 * have shared their availability at all (app.member_availability_shared: no
 * busy hours from someone who never filled it in says nothing), the hour in
 * their zone is inside the hours the availability grid covers (8 am to
 * 11 pm: nobody is "free now" at 3 am), and that hour is not busy.
 */

const WEEKDAY: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** The weekday (Monday 0) and hour of `now` in `timeZone`. */
export function localSlot(now: Date, timeZone: string): { day: number; hour: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(now);
  }
  const day = WEEKDAY[parts.find((p) => p.type === "weekday")?.value ?? "Mon"] ?? 0;
  const hour = Number.parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10) % 24;
  return { day, hour };
}

/** What the database says about a member's availability (null: the viewer may not see it). */
export interface SharedAvailability {
  busy: readonly string[] | null;
  shared: boolean | null;
}

/** null when the viewer may not see this member's busy hours, or they never shared any. */
export function isFreeNow(
  { busy, shared }: SharedAvailability,
  timeZone: string,
  now: Date = new Date(),
): boolean | null {
  if (busy === null || shared !== true) return null;
  const { day, hour } = localSlot(now, timeZone);
  if (hour < FIRST_HOUR || hour > LAST_HOUR) return false;
  return !busy.includes(cellKey(day, hour));
}
