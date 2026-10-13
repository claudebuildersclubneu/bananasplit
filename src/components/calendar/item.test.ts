import { afterAll, describe, expect, it } from "vitest";

import { zonedTimeToInstant } from "@/lib/calendar/dates";

import { chipTime, type CalendarItem, itemLabel, shortTime, timeRange } from "./item";
import { formatEventTimeRange } from "./utils";

/**
 * The calendar's time labels, for a viewer in New York while the process
 * runs in UTC, as the server does on Vercel. The labels must read the zone
 * passed in: a runtime-zone formatter printed "11p" for a 7pm EDT event in
 * the server HTML and "7p" after hydration.
 */
const runtimeZone = process.env.TZ;
process.env.TZ = "UTC";
afterAll(() => {
  if (runtimeZone === undefined) delete process.env.TZ;
  else process.env.TZ = runtimeZone;
});

const NY = "America/New_York";

// Newer ICU puts a narrow no-break space before AM/PM.
const plain = (text: string) => text.replace(/[  ]/g, " ");

function event(start: Date, end: Date): CalendarItem {
  return {
    id: "e1",
    title: "Social",
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: false,
    kind: "SOCIAL",
    visibility: "INTERNAL",
    location: null,
    syncState: "NOT_APPLICABLE",
    needsReview: false,
    rsvp: null,
  };
}

// 7:00-8:30pm EDT on Thursday Sept 24 is 23:00-00:30 UTC.
const evening = event(
  zonedTimeToInstant("2026-09-24", NY, 19),
  zonedTimeToInstant("2026-09-24", NY, 20, 30),
);

describe("calendar time labels on a UTC server", () => {
  it("runs this file in a zone that differs from the viewer's", () => {
    expect(new Date(evening.start).getHours()).toBe(23);
  });

  it("prints a 7pm EDT event as 7p, not 11p", () => {
    expect(chipTime(evening, NY)).toBe("7p");
    expect(plain(shortTime(evening, NY))).toBe("7:00 PM");
    expect(plain(timeRange(evening, NY))).toBe("7:00 – 8:30 PM");
    expect(plain(itemLabel(evening, "Social", "Internal", NY))).toBe(
      "Social, 7:00 – 8:30 PM, Social, Internal",
    );
  });

  it("reads the minute in the display zone", () => {
    // On the hour in UTC is half past in India.
    expect(chipTime(evening, "Asia/Kolkata")).toBe("4:30a");
  });

  it("prints the event page's time and date in the viewer's zone", () => {
    const text = plain(
      formatEventTimeRange(new Date(evening.start), new Date(evening.end), false, {
        org: NY,
        viewer: NY,
      }),
    );
    // One day in New York, though the end is already Friday in UTC.
    expect(text).toBe("Sep 24, 2026, 7:00 PM – 8:30 PM");
  });

  it("prints an all-day event as whole days in the org's zone", () => {
    const text = formatEventTimeRange(
      zonedTimeToInstant("2026-09-24", NY),
      zonedTimeToInstant("2026-09-25", NY),
      true,
      { org: NY, viewer: "Asia/Tokyo" },
    );
    expect(text).toBe("Sep 24, 2026 (all day)");
  });
});
