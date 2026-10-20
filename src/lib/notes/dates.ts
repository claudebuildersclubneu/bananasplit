/**
 * Day labels for date chips, per the Moonstone contract: "Today",
 * "Tomorrow", "Yesterday", then "Wed, Oct 14" (with the year only outside
 * the current one). Keys are "YYYY-MM-DD" days, read without a time zone.
 */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Today's key in the viewer's own calendar. */
export function todayKey(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function utcDay(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

export function dayLabel(key: string | null | undefined, today: string = todayKey()): string {
  if (!key || !DATE_KEY.test(key)) return "Pick a date";
  const days = Math.round((utcDay(key).getTime() - utcDay(today).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  const date = utcDay(key);
  const base = `${WEEKDAYS[date.getUTCDay()]}, ${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
  return key.slice(0, 4) === today.slice(0, 4) ? base : `${base}, ${key.slice(0, 4)}`;
}
