/**
 * Budget periods, the human way: a club's money runs by school year (or
 * semester, or calendar year), so these build sensible defaults instead of
 * asking for a label and two bare dates. Pure and client-safe.
 *
 * Dates are YYYY-MM-DD strings (what <input type="date"> uses) and the
 * stored @db.Date values are UTC midnight, so anything shown to people is
 * formatted in UTC: formatting a 2026-08-01 date in New York would print
 * July 31.
 */

export interface PeriodDraft {
  label: string;
  /** YYYY-MM-DD */
  startsOn: string;
  /** YYYY-MM-DD, inclusive. */
  endsOn: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** The school year that starts on August 1 of `y` ("2026–27"). */
function schoolYearStarting(y: number): PeriodDraft {
  return {
    label: `${y}–${String((y + 1) % 100).padStart(2, "0")}`,
    startsOn: ymd(y, 8, 1),
    endsOn: ymd(y + 1, 7, 31),
  };
}

/**
 * The school year to budget for around `today`: August 1 to July 31
 * ("2026–27"). From July on it is already next year's, since that's the one
 * a treasurer is setting up then.
 */
export function schoolYear(today: Date = new Date()): PeriodDraft {
  return schoolYearStarting(today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1);
}

/**
 * The school year `day` falls in (August 1 to July 31). Unlike schoolYear(),
 * a July date stays in the year that is ending, so the period always covers it.
 */
export function schoolYearContaining(day: Date): PeriodDraft {
  return schoolYearStarting(day.getMonth() >= 7 ? day.getFullYear() : day.getFullYear() - 1);
}

/** The semester around `today`: Fall (Aug–Dec), Spring (Jan–May) or Summer (Jun–Jul). */
export function semester(today: Date = new Date()): PeriodDraft {
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  if (m >= 8) return { label: `Fall ${y}`, startsOn: ymd(y, 8, 1), endsOn: ymd(y, 12, 31) };
  if (m <= 5) return { label: `Spring ${y}`, startsOn: ymd(y, 1, 1), endsOn: ymd(y, 5, 31) };
  return { label: `Summer ${y}`, startsOn: ymd(y, 6, 1), endsOn: ymd(y, 7, 31) };
}

/** January to December. */
export function calendarYear(today: Date = new Date()): PeriodDraft {
  const y = today.getFullYear();
  return { label: String(y), startsOn: ymd(y, 1, 1), endsOn: ymd(y, 12, 31) };
}

export const PERIOD_PRESETS = [
  { id: "school-year", name: "School year", hint: "Aug 1 – Jul 31", make: schoolYear },
  { id: "semester", name: "This semester", hint: "Fall, spring or summer", make: semester },
  { id: "calendar-year", name: "Calendar year", hint: "Jan 1 – Dec 31", make: calendarYear },
] as const;

export type PeriodPresetId = (typeof PERIOD_PRESETS)[number]["id"];

/** A stored @db.Date (UTC midnight) as YYYY-MM-DD. */
export function toDateValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** YYYY-MM-DD as the UTC-midnight Date Prisma stores for @db.Date. */
export function fromDateValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || toDateValue(d) !== value ? null : d;
}

const dayFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** "Aug 1, 2026" for a stored @db.Date, never shifted a day by the viewer's timezone. */
export function formatPeriodDate(date: Date | string): string {
  return dayFmt.format(typeof date === "string" ? new Date(date) : date);
}

/** "Aug 1, 2026 – Jul 31, 2027". */
export function formatPeriodRange(start: Date | string, end: Date | string): string {
  return `${formatPeriodDate(start)} – ${formatPeriodDate(end)}`;
}

/** Whether `day` (any time that day, UTC) falls inside the period. */
export function periodCovers(period: { startsOn: Date; endsOn: Date }, day: Date): boolean {
  const t = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  return t >= period.startsOn.getTime() && t <= period.endsOn.getTime();
}
