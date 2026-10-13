import { afterAll, describe, expect, it } from "vitest";

import { zonedTimeToInstant } from "./dates";
import {
  agendaDays,
  bucketByDay,
  dayWindowFor,
  itemDayKeys,
  MIN_SLOT_MINUTES,
  monthGridShape,
  monthWindowFor,
  placeDayItems,
  shiftMonthKey,
  visibleHourRange,
  weekdayOf,
  weekWindowFor,
  windowDays,
  type GridItem,
} from "./grid";

/**
 * The calendar's layout maths, for a viewer in New York while the process
 * itself runs in UTC: the server's zone on Vercel. Every timed event is
 * placed in the zone passed in, so nothing here may depend on the runtime's
 * own zone, and running the whole file in a zone that differs from the
 * viewer's is what proves it.
 */
const runtimeZone = process.env.TZ;
process.env.TZ = "UTC";
afterAll(() => {
  if (runtimeZone === undefined) delete process.env.TZ;
  else process.env.TZ = runtimeZone;
});

const NY = "America/New_York";

const timed = (id: string, start: string, end: string): GridItem => ({
  id,
  start,
  end,
  allDay: false,
});
const allDay = (id: string, start: string, end: string): GridItem => ({
  id,
  start,
  end,
  allDay: true,
});

/** An ISO instant for a New York wall-clock time. */
function at(day: string, hour: number, minute = 0): string {
  return zonedTimeToInstant(day, NY, hour, minute).toISOString();
}

describe("itemDayKeys", () => {
  it("puts a timed event on its day in the viewer's zone", () => {
    expect(itemDayKeys(timed("a", at("2026-09-24", 18), at("2026-09-24", 19)), NY)).toEqual([
      "2026-09-24",
    ]);
  });

  it("keeps an event that ends exactly at midnight on the day it started", () => {
    expect(itemDayKeys(timed("a", at("2026-09-24", 21), at("2026-09-25", 0)), NY)).toEqual([
      "2026-09-24",
    ]);
  });

  it("spans a timed event that runs past midnight", () => {
    expect(itemDayKeys(timed("a", at("2026-09-24", 21), at("2026-09-25", 1)), NY)).toEqual([
      "2026-09-24",
      "2026-09-25",
    ]);
  });

  it("covers every day of an all-day span, exclusive end", () => {
    expect(itemDayKeys(allDay("a", "2026-09-24", "2026-09-27"), NY)).toEqual([
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
    ]);
  });

  it("treats a one-day all-day event as one day", () => {
    expect(itemDayKeys(allDay("a", "2026-09-24", "2026-09-25"), NY)).toEqual(["2026-09-24"]);
    expect(itemDayKeys(allDay("a", "2026-09-24", "2026-09-24"), NY)).toEqual(["2026-09-24"]);
  });
});

describe("bucketByDay", () => {
  it("lists all-day events before timed ones, then by start", () => {
    const later = timed("later", at("2026-09-24", 19), at("2026-09-24", 20));
    const earlier = timed("earlier", at("2026-09-24", 9), at("2026-09-24", 10));
    const whole = allDay("whole", "2026-09-24", "2026-09-25");
    const bucket = bucketByDay([later, earlier, whole], NY).get("2026-09-24");
    expect(bucket?.map((i) => i.id)).toEqual(["whole", "earlier", "later"]);
  });

  it("puts a multi-day event in every day it covers", () => {
    const byDay = bucketByDay([allDay("trip", "2026-09-24", "2026-09-26")], NY);
    expect(byDay.get("2026-09-24")?.length).toBe(1);
    expect(byDay.get("2026-09-25")?.length).toBe(1);
    expect(byDay.get("2026-09-26")).toBeUndefined();
  });
});

describe("monthGridShape", () => {
  it("returns six rows of seven for a 42-day window", () => {
    const { rows } = monthGridShape("2026-08-30", 42, "2026-09-24");
    expect(rows).toHaveLength(6);
    expect(rows.every((row) => row.length === 7)).toBe(true);
  });

  it("marks the month the window is mostly about, and the days outside it", () => {
    const { rows, monthKey } = monthGridShape("2026-08-30", 42, "2026-09-24");
    expect(monthKey).toBe("2026-09");
    expect(rows[0][0]).toMatchObject({ key: "2026-08-30", day: 30, inMonth: false });
    expect(rows[0][2]).toMatchObject({ key: "2026-09-01", day: 1, inMonth: true });
  });

  it("marks today and the weekend columns", () => {
    const { rows } = monthGridShape("2026-08-30", 42, "2026-09-24");
    const today = rows.flat().find((cell) => cell.key === "2026-09-24");
    expect(today?.isToday).toBe(true);
    expect(rows[0][0].isWeekend).toBe(true);
    expect(rows[0][6].isWeekend).toBe(true);
    expect(rows[0][3].isWeekend).toBe(false);
  });
});

describe("placeDayItems", () => {
  const day = "2026-09-24";

  it("places an event by minutes from midnight in the viewer's zone", () => {
    const [placed] = placeDayItems(day, [timed("a", at(day, 18), at(day, 19, 30))], NY);
    expect(placed.startMinutes).toBe(18 * 60);
    expect(placed.endMinutes).toBe(19 * 60 + 30);
    expect(placed.lanes).toBe(1);
    expect(placed.lane).toBe(0);
  });

  it("gives overlapping events their own lanes", () => {
    const placed = placeDayItems(
      day,
      [timed("a", at(day, 18), at(day, 20)), timed("b", at(day, 19), at(day, 21))],
      NY,
    );
    expect(placed.map((p) => p.lane)).toEqual([0, 1]);
    expect(placed.every((p) => p.lanes === 2)).toBe(true);
  });

  it("reuses a lane once the earlier event has finished", () => {
    const placed = placeDayItems(
      day,
      [timed("a", at(day, 18), at(day, 19)), timed("b", at(day, 19), at(day, 20))],
      NY,
    );
    // Separate clusters: each gets the full width.
    expect(placed.every((p) => p.lanes === 1)).toBe(true);
  });

  it("separates events that only collide once drawn at the minimum height", () => {
    const placed = placeDayItems(
      day,
      [timed("a", at(day, 18), at(day, 18, 15)), timed("b", at(day, 18, 20), at(day, 18, 35))],
      NY,
    );
    expect(placed.every((p) => p.lanes === 2)).toBe(true);
    expect(MIN_SLOT_MINUTES).toBeGreaterThan(15);
  });

  it("clamps an event that began the day before and flags it", () => {
    const placed = placeDayItems(day, [timed("a", at("2026-09-23", 22), at(day, 1))], NY);
    expect(placed[0].startMinutes).toBe(0);
    expect(placed[0].endMinutes).toBe(60);
    expect(placed[0].continuesFrom).toBe(true);
  });

  it("clamps an event running past midnight and flags it", () => {
    const placed = placeDayItems(day, [timed("a", at(day, 22), at("2026-09-25", 1))], NY);
    expect(placed[0].startMinutes).toBe(22 * 60);
    expect(placed[0].endMinutes).toBe(1440);
    expect(placed[0].continuesInto).toBe(true);
  });

  it("leaves all-day events out of the hour column", () => {
    expect(placeDayItems(day, [allDay("a", day, "2026-09-25")], NY)).toEqual([]);
  });
});

describe("visibleHourRange", () => {
  it("opens on a default band when nothing is scheduled", () => {
    expect(visibleHourRange([])).toEqual({ startHour: 8, endHour: 18 });
  });

  it("frames the events with an hour either side", () => {
    const range = visibleHourRange([{ startMinutes: 18 * 60, endMinutes: 20 * 60 }], {
      minHours: 4,
    });
    expect(range).toEqual({ startHour: 17, endHour: 21 });
  });

  it("widens a narrow band up to the minimum", () => {
    const range = visibleHourRange([{ startMinutes: 18 * 60, endMinutes: 19 * 60 }], {
      minHours: 10,
    });
    expect(range.endHour - range.startHour).toBe(10);
    expect(range.startHour).toBeLessThanOrEqual(17);
    expect(range.endHour).toBeLessThanOrEqual(24);
  });

  it("never runs outside the day", () => {
    const range = visibleHourRange([{ startMinutes: 0, endMinutes: 1440 }]);
    expect(range).toEqual({ startHour: 0, endHour: 24 });
  });
});

describe("agendaDays", () => {
  it("lists only the days that have something, in order", () => {
    const days = agendaDays(
      [
        timed("b", at("2026-09-26", 18), at("2026-09-26", 19)),
        timed("a", at("2026-09-24", 18), at("2026-09-24", 19)),
      ],
      "2026-09-23",
      7,
      NY,
    );
    expect(days.map((d) => d.key)).toEqual(["2026-09-24", "2026-09-26"]);
    expect(days[0].items.map((i) => i.id)).toEqual(["a"]);
  });

  it("is empty when the window has nothing", () => {
    expect(agendaDays([], "2026-09-23", 7, NY)).toEqual([]);
  });
});

describe("windows", () => {
  it("starts a month window on the Sunday on or before the 1st", () => {
    // 1 September 2026 is a Tuesday.
    expect(monthWindowFor("2026-09")).toEqual({ fromKey: "2026-08-30", toKey: "2026-10-11" });
  });

  it("starts a week window on Sunday", () => {
    expect(weekWindowFor("2026-09-24")).toEqual({ fromKey: "2026-09-20", toKey: "2026-09-27" });
    expect(weekWindowFor("2026-09-20")).toEqual({ fromKey: "2026-09-20", toKey: "2026-09-27" });
  });

  it("makes a one-day window", () => {
    expect(dayWindowFor("2026-09-24")).toEqual({ fromKey: "2026-09-24", toKey: "2026-09-25" });
  });

  it("moves a month key across a year boundary", () => {
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
  });

  it("counts the days a window covers", () => {
    expect(windowDays("2026-08-30", "2026-10-11")).toBe(42);
    expect(windowDays("2026-09-20", "2026-09-27")).toBe(7);
  });

  it("reads the weekday of a key without a timezone", () => {
    expect(weekdayOf("2026-09-20")).toBe(0);
    expect(weekdayOf("2026-09-24")).toBe(4);
  });
});

describe("an evening event on a UTC server", () => {
  // 8-10pm EDT on Thursday the 24th is 00:00-02:00 UTC on Friday the 25th.
  const evening = timed("social", at("2026-09-24", 20), at("2026-09-24", 22));

  it("runs this file in a zone that differs from the viewer's", () => {
    expect(new Date(evening.start).getUTCHours()).toBe(0);
    expect(new Date(evening.start).getHours()).toBe(0);
  });

  it("lands in the viewer's Thursday cell, not the server's Friday", () => {
    expect(itemDayKeys(evening, NY)).toEqual(["2026-09-24"]);
    const byDay = bucketByDay([evening], NY);
    expect(byDay.get("2026-09-24")?.map((i) => i.id)).toEqual(["social"]);
    expect(byDay.has("2026-09-25")).toBe(false);
  });

  it("sits at 8pm in the viewer's hour column", () => {
    const [placed] = placeDayItems("2026-09-24", [evening], NY);
    expect(placed.startMinutes).toBe(20 * 60);
    expect(placed.endMinutes).toBe(22 * 60);
    expect(placed.continuesInto).toBe(false);
  });

  it("is placed in whichever zone is passed in", () => {
    // The same instant for a viewer in UTC really is Friday, midnight to 2am.
    expect(itemDayKeys(evening, "UTC")).toEqual(["2026-09-25"]);
    expect(placeDayItems("2026-09-25", [evening], "UTC")[0].startMinutes).toBe(0);
  });
});
