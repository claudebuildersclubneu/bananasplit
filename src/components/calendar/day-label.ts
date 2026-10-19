import { addDaysToKey } from "@/lib/calendar/dates";

/**
 * A day as the app says it everywhere: "Today", "Tomorrow", then
 * "Wed, Oct 14" (with the year only outside the current one). Keys are
 * "YYYY-MM-DD"; `todayKey` defaults to the viewer's own today, so call it
 * from the browser (or pass the org's today on the server).
 */

const DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const DAY_WITH_YEAR = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function localTodayKey(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function shortDay(dayKey: string, todayKey: string = localTodayKey()): string {
  if (dayKey === todayKey) return "Today";
  if (dayKey === addDaysToKey(todayKey, 1)) return "Tomorrow";
  const date = new Date(`${dayKey}T00:00:00Z`);
  return (dayKey.slice(0, 4) === todayKey.slice(0, 4) ? DAY : DAY_WITH_YEAR).format(date);
}

/** shortDay for an instant, read in `timeZone`. */
export function shortDayAt(at: Date, timeZone: string, now: Date = new Date()): string {
  const key = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    }).format(d);
  return shortDay(key(at), key(now));
}
