import { allDaySpan, zonedDateKey } from "@/lib/calendar/dates";

/** "YYYY-MM-DDTHH:mm" in the viewer's local time, for datetime-local inputs. */
export function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "YYYY-MM-DD" in the viewer's local time, for all-day date inputs. */
export function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The event page's "when". All-day events are whole days in the org's zone;
 * timed events read in `zones.viewer`. Both zones are explicit because the
 * page renders on the server (UTC on Vercel) and hydrates in the browser,
 * and the runtime's own zone printed a different time in each.
 */
export function formatEventTimeRange(
  startsAt: Date,
  endsAt: Date,
  allDay: boolean,
  zones: { org: string; viewer: string },
): string {
  if (allDay) {
    // Whole days in the org timezone, printed as dates (no clock shift).
    const span = allDaySpan(startsAt, endsAt, zones.org);
    const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" });
    const first = fmt.format(new Date(`${span.start}T00:00:00Z`));
    if (span.lastDay === span.start) return `${first} (all day)`;
    return `${first} – ${fmt.format(new Date(`${span.lastDay}T00:00:00Z`))} (all day)`;
  }
  const timeZone = zones.viewer;
  const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone });
  const timeFmt = new Intl.DateTimeFormat(undefined, { timeStyle: "short", timeZone });
  const sameDay = zonedDateKey(startsAt, timeZone) === zonedDateKey(endsAt, timeZone);
  return sameDay
    ? `${dateFmt.format(startsAt)}, ${timeFmt.format(startsAt)} – ${timeFmt.format(endsAt)}`
    : `${dateFmt.format(startsAt)} ${timeFmt.format(startsAt)} – ${dateFmt.format(endsAt)} ${timeFmt.format(endsAt)}`;
}
