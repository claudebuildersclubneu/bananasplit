import { addDaysToKey, weekdayOfKey } from "./dates";

/**
 * Typed due dates for the task form's date menu ("next thu", "in 3 days",
 * "Oct 16") and its quick picks. Pure: date keys in, date keys out, read
 * against the viewer's today ("YYYY-MM-DD").
 */

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const pad = (n: number) => String(n).padStart(2, "0");

function keyOf(year: number, month: number, day: number): string | null {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** The next `weekday` (0 Sunday) on or after today, or strictly after it. */
function nextWeekday(todayKey: string, weekday: number, strict: boolean): string {
  const ahead = (weekday - weekdayOfKey(todayKey) + 7) % 7;
  return addDaysToKey(todayKey, ahead === 0 && strict ? 7 : ahead);
}

/** A day with no year rolls into next year once this year's has passed. */
function upcoming(todayKey: string, month: number, day: number): string | null {
  const year = Number(todayKey.slice(0, 4));
  const key = keyOf(year, month, day);
  if (!key) return null;
  return key < todayKey ? keyOf(year + 1, month, day) : key;
}

/**
 * Reads a typed date: today, tomorrow, next week, a weekday ("thu", "next
 * friday"), "in 3 days" / "in 2 weeks", "10/16", "Oct 16", "16 oct" or
 * "2026-10-16". Null when it can't tell.
 */
export function parseDueText(raw: string, todayKey: string): string | null {
  const t = raw.trim().toLowerCase().replace(/[.,]/g, " ").replace(/\s+/g, " ");
  if (!t) return null;
  if (/^(today|tod|now)$/.test(t)) return todayKey;
  if (/^(tomorrow|tmr|tmrw|tom)$/.test(t)) return addDaysToKey(todayKey, 1);
  if (t === "next week") return nextWeekday(todayKey, 1, true);
  let m = /^in (\d{1,3}) ?(d|day|days|w|wk|week|weeks)$/.exec(t);
  if (m) return addDaysToKey(todayKey, Number(m[1]) * (m[2].startsWith("w") ? 7 : 1));
  m = /^(next |this )?([a-z]{3,9})$/.exec(t);
  if (m) {
    const wd = WEEKDAYS.findIndex((w) => m![2].startsWith(w));
    if (wd >= 0) return nextWeekday(todayKey, wd, Boolean(m[1]?.startsWith("next")));
  }
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return keyOf(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(t);
  if (m) {
    if (!m[3]) return upcoming(todayKey, Number(m[1]), Number(m[2]));
    const year = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
    return keyOf(year, Number(m[1]), Number(m[2]));
  }
  m = /^([a-z]{3,9}) (\d{1,2})$/.exec(t) ?? null;
  if (m) {
    const month = MONTHS.findIndex((x) => m![1].startsWith(x));
    if (month >= 0) return upcoming(todayKey, month + 1, Number(m[2]));
  }
  m = /^(\d{1,2}) ([a-z]{3,9})$/.exec(t);
  if (m) {
    const month = MONTHS.findIndex((x) => m![2].startsWith(x));
    if (month >= 0) return upcoming(todayKey, month + 1, Number(m[1]));
  }
  return null;
}

/** Today, tomorrow, this Friday (next week's once it's the weekend) and next Monday. */
export function quickDues(todayKey: string) {
  const wd = weekdayOfKey(todayKey);
  return [
    { label: "Today", key: todayKey, shortcut: "T" },
    { label: "Tomorrow", key: addDaysToKey(todayKey, 1), shortcut: "M" },
    {
      label: wd >= 5 ? "Next Friday" : "This Friday",
      key: nextWeekday(todayKey, 5, wd === 5),
      shortcut: "F",
    },
    { label: "Next week", key: nextWeekday(todayKey, 1, true), shortcut: "W" },
  ];
}
