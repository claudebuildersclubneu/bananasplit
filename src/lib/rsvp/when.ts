/**
 * An RSVP event's date and time, in the club's timezone (guests may be
 * anywhere, so the zone is always named). Pure and client-safe.
 */

function parts(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(date);
}

function dayKey(date: Date, timeZone: string): string {
  return parts(date, timeZone, { year: "numeric", month: "2-digit", day: "2-digit" });
}

/** "OCT" and "15", for the date tile. */
export function dateTile(start: Date, timeZone: string): { month: string; day: string } {
  return {
    month: parts(start, timeZone, { month: "short" }).toUpperCase(),
    day: parts(start, timeZone, { day: "numeric" }),
  };
}

/** "Thursday, October 15" (all-day events count their dates in UTC). */
export function dateLine(start: Date, timeZone: string, allDay = false): string {
  return parts(start, allDay ? "UTC" : timeZone, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** "6:00 – 7:00 PM EDT", "6:00 PM – Fri 1:00 AM EDT", or "All day". */
export function timeLine(start: Date, end: Date, timeZone: string, allDay = false): string {
  if (allDay) return "All day";
  const time = (d: Date) => parts(d, timeZone, { hour: "numeric", minute: "2-digit" });
  const zone = parts(start, timeZone, { timeZoneName: "short" }).split(" ").pop() ?? "";
  if (dayKey(start, timeZone) !== dayKey(end, timeZone)) {
    const endDay = parts(end, timeZone, { weekday: "short" });
    return `${time(start)} – ${endDay} ${time(end)} ${zone}`;
  }
  const s = time(start);
  const e = time(end);
  const sameHalf = s.slice(-2) === e.slice(-2);
  return `${sameHalf ? s.slice(0, -3) : s} – ${e} ${zone}`;
}

/** One line for emails and texts: "Thursday, October 15, 6:00 – 7:00 PM EDT". */
export function whenLine(start: Date, end: Date, timeZone: string, allDay = false): string {
  return `${dateLine(start, timeZone, allDay)}, ${timeLine(start, end, timeZone, allDay)}`;
}

/** "6:00 PM", for the text sent an hour before. */
export function startTime(start: Date, timeZone: string): string {
  return parts(start, timeZone, { hour: "numeric", minute: "2-digit" });
}
