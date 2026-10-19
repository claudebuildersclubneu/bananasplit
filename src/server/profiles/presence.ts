import { cellKey, FIRST_HOUR, LAST_HOUR } from "@/lib/availability";

/**
 * "Free now", from the busy hours a member already shares (the "d-h"
 * cells of a typical week in their own time zone, Monday = 0). Pure.
 *
 * A member counts as free when the viewer may see their busy hours, the
 * hour in their zone is inside the hours the availability grid covers
 * (8 am to 11 pm: nobody is "free now" at 3 am), and that hour is not busy.
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

/** null when the viewer may not see this member's busy hours. */
export function isFreeNow(busy: readonly string[] | null, timeZone: string, now: Date = new Date()): boolean | null {
  if (busy === null) return null;
  const { day, hour } = localSlot(now, timeZone);
  if (hour < FIRST_HOUR || hour > LAST_HOUR) return false;
  return !busy.includes(cellKey(day, hour));
}
