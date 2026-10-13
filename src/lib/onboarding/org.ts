import { TZDate } from "@date-fns/tz";

import { localDateKey } from "@/lib/tasks/dates";

export type {
  FinanceInput,
  MeetingInput,
  TaskLabelsInput,
  TeamInput,
  TeamsInput,
} from "./org.schema";

/**
 * Org setup (Flow B) inputs, shared by the step forms and their Server
 * Actions. Pure and client-safe: the zod schemas the actions run are in
 * ./org.schema (server only), so the step forms never ship zod.
 */

// ---------------------------------------------------------------- privacy

/** MemberVisibility, in the words the select shows (Settings > Privacy). */
export const VISIBILITY_OPTIONS = [
  { value: "MEMBERS", label: "Everyone in the org" },
  { value: "ADMINS", label: "Owners and admins" },
  { value: "OWNER", label: "Owners only" },
  { value: "HIDDEN", label: "Hidden from members' list" },
] as const;
export type VisibilityValue = (typeof VISIBILITY_OPTIONS)[number]["value"];

// ---------------------------------------------------------------- B3 labels

/** B3: the org's task labels, as the setup step leaves them. */
export const MAX_SETUP_LABELS = 12;

// ---------------------------------------------------------------- B4 finance

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/**
 * The fiscal year that contains `today` (a YYYY-MM-DD date in the org's
 * zone), starting on the 1st of `startMonth`: its label and its first and
 * last days.
 */
export function fiscalYearFor(
  today: string,
  startMonth: number,
): { label: string; startsOn: string; endsOn: string } {
  const [y, m] = today.split("-").map(Number);
  const startYear = m >= startMonth ? y : y - 1;
  const start = `${startYear}-${String(startMonth).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(startYear + 1, startMonth - 1, 1) - 24 * 60 * 60 * 1000);
  const endsOn = endDate.toISOString().slice(0, 10);
  const label =
    startMonth === 1
      ? `FY ${startYear}`
      : `FY ${startYear}–${String((startYear + 1) % 100).padStart(2, "0")}`;
  return { label, startsOn: start, endsOn };
}

// ---------------------------------------------------------------- B5 teams

export const CADENCES = [
  { value: "weekly", label: "weekly" },
  { value: "biweekly", label: "every 2 weeks" },
] as const;
export type Cadence = (typeof CADENCES)[number]["value"];

export const MAX_TEAMS = 20;
/** Meetings added to the calendar: about one semester. */
export const MEETING_WEEKS_AHEAD = 12;

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "Mon 7 PM weekly", "Thu 5:30 PM every 2 weeks" */
export function describeMeeting(m: { day: number; minutes: number; cadence: string }): string {
  const h = Math.floor(m.minutes / 60);
  const min = m.minutes % 60;
  const h12 = ((h + 11) % 12) + 1;
  const time = `${h12}${min ? `:${String(min).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
  return `${DAY_NAMES[m.day]} ${time} ${m.cadence === "biweekly" ? "every 2 weeks" : "weekly"}`;
}

/** The next `count` meeting starts (UTC instants) at a local weekday/time in `tz`. */
export function meetingOccurrences(
  meeting: { day: number; minutes: number; cadence: "weekly" | "biweekly" },
  tz: string,
  now: Date,
  weeksAhead: number,
): Date[] {
  const today = localDateKey(now, tz);
  const [y, m, d] = today.split("-").map(Number);
  // Weekday of today in the org's zone, Monday = 0.
  const todayDow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  let offset = (meeting.day - todayDow + 7) % 7;
  const h = Math.floor(meeting.minutes / 60);
  const min = meeting.minutes % 60;
  const first = new TZDate(y, m - 1, d + offset, h, min, tz);
  if (first.getTime() <= now.getTime()) offset += 7;
  const step = meeting.cadence === "biweekly" ? 14 : 7;
  const out: Date[] = [];
  for (let days = offset; days < weeksAhead * 7; days += step) {
    out.push(new Date(new TZDate(y, m - 1, d + days, h, min, tz).getTime()));
  }
  return out;
}
