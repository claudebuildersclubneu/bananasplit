import type {
  CalendarSyncState,
  EventKind,
  EventVisibility,
  RSVPStatus,
} from "@/generated/prisma/enums";
import { zonedDateTimeLocal } from "@/lib/calendar/dates";
import type { GridItem } from "@/lib/calendar/grid";

/**
 * One event as the grid sees it. Built on the server (see the calendar
 * page) and small on purpose: this is what a month window of a few dozen
 * events ships to the browser.
 */
export interface CalendarItem extends GridItem {
  id: string;
  title: string;
  /** Timed: an ISO instant. All-day: "YYYY-MM-DD". */
  start: string;
  /** Timed: an ISO instant. All-day: the day AFTER the last day. */
  end: string;
  allDay: boolean;
  kind: EventKind;
  visibility: EventVisibility;
  location: string | null;
  syncState: CalendarSyncState;
  needsReview: boolean;
  /** The viewer's own answer, or null when they are not invited. */
  rsvp: RSVPStatus | null;
  /**
   * Set when this is a task's due date rather than an event: drawn as a
   * checkbox chip on its day, and opens the task.
   */
  task?: { done: boolean };
}

/*
 * Every time here is formatted in an explicit zone, passed in by the view.
 * The grid renders on the server and hydrates in the browser; a formatter
 * left on the runtime's zone printed "11p" for a 7pm EDT event in the
 * server HTML (UTC on Vercel) and then changed it in the browser.
 */
const timeFormatters = new Map<string, Intl.DateTimeFormat>();
const hourFormatters = new Map<string, Intl.DateTimeFormat>();

function timeFmt(timeZone: string): Intl.DateTimeFormat {
  let f = timeFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone });
    timeFormatters.set(timeZone, f);
  }
  return f;
}

function hourFmt(timeZone: string): Intl.DateTimeFormat {
  let f = hourFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat(undefined, { hour: "numeric", timeZone });
    hourFormatters.set(timeZone, f);
  }
  return f;
}

/**
 * The compact form a month chip uses: "6p", or "6:30p" when it is not on
 * the hour. A seven-column grid gives a chip about 120px, and "6:00 PM"
 * spends a third of that saying what "6p" says; the full time is one click
 * away in the popover and is what every other surface prints.
 *
 * Locales that do not use a meridiem fall back to their own short form.
 */
export function chipTime(item: CalendarItem, timeZone: string): string {
  if (item.allDay) return "";
  const date = new Date(item.start);
  // The minute in the display zone: a half-hour zone (India) puts a
  // UTC-on-the-hour event at :30.
  const onTheHour = zonedDateTimeLocal(date, timeZone).endsWith(":00");
  const text = (onTheHour ? hourFmt(timeZone) : timeFmt(timeZone)).format(date);
  return text.replace(/\s*([AP])M$/i, (_, m: string) => m.toLowerCase()).replace(/\s+/g, "");
}

/** "6:00 PM", or "" for an all-day event. */
export function shortTime(item: CalendarItem, timeZone: string): string {
  if (item.allDay) return "";
  return timeFmt(timeZone).format(new Date(item.start));
}

/** "6:00 – 7:30 PM" on a chip and in a popover; "All day" for an all-day event. */
export function timeRange(item: CalendarItem, timeZone: string): string {
  if (item.allDay) return "All day";
  const start = timeFmt(timeZone).format(new Date(item.start));
  const end = timeFmt(timeZone).format(new Date(item.end));
  if (start === end) return start;
  // Drop the meridiem from the start when both sides share it.
  const sm = start.slice(-2);
  const em = end.slice(-2);
  return `${sm === em ? start.slice(0, -3) : start} – ${end}`;
}

/** The chip's accessible name: everything the visual chip drops on a phone. */
export function itemLabel(
  item: CalendarItem,
  kindLabel: string,
  visibilityLabel: string,
  timeZone: string,
): string {
  if (item.task) return `Task: ${item.title}, due this day${item.task.done ? ", done" : ""}`;
  const when = item.allDay ? "all day" : timeRange(item, timeZone);
  const where = item.location ? `, ${item.location}` : "";
  return `${item.title}, ${when}${where}, ${kindLabel}, ${visibilityLabel}`;
}
