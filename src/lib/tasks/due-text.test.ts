import { describe, expect, it } from "vitest";

import { parseDueText, quickDues } from "./due-text";

// Monday, October 12 2026.
const TODAY = "2026-10-12";

describe("typed due dates", () => {
  it("reads the everyday words", () => {
    expect(parseDueText("today", TODAY)).toBe("2026-10-12");
    expect(parseDueText("Tomorrow", TODAY)).toBe("2026-10-13");
    expect(parseDueText("next week", TODAY)).toBe("2026-10-19");
    expect(parseDueText("in 3 days", TODAY)).toBe("2026-10-15");
    expect(parseDueText("in 2 weeks", TODAY)).toBe("2026-10-26");
  });

  it("reads weekdays: the coming one, and 'next' never today", () => {
    expect(parseDueText("thu", TODAY)).toBe("2026-10-15");
    expect(parseDueText("next thursday", TODAY)).toBe("2026-10-15");
    expect(parseDueText("monday", TODAY)).toBe("2026-10-12");
    expect(parseDueText("next mon", TODAY)).toBe("2026-10-19");
  });

  it("reads dates, rolling a passed day into next year", () => {
    expect(parseDueText("Oct 16", TODAY)).toBe("2026-10-16");
    expect(parseDueText("16 oct", TODAY)).toBe("2026-10-16");
    expect(parseDueText("10/16", TODAY)).toBe("2026-10-16");
    expect(parseDueText("1/5", TODAY)).toBe("2027-01-05");
    expect(parseDueText("2026-11-02", TODAY)).toBe("2026-11-02");
    expect(parseDueText("12/1/27", TODAY)).toBe("2027-12-01");
  });

  it("says nothing when it can't tell", () => {
    expect(parseDueText("", TODAY)).toBeNull();
    expect(parseDueText("soonish", TODAY)).toBeNull();
    expect(parseDueText("2/30", TODAY)).toBeNull();
  });

  it("offers today, tomorrow, Friday and next Monday", () => {
    expect(quickDues(TODAY).map((q) => [q.label, q.key])).toEqual([
      ["Today", "2026-10-12"],
      ["Tomorrow", "2026-10-13"],
      ["This Friday", "2026-10-16"],
      ["Next week", "2026-10-19"],
    ]);
    // On a Saturday, Friday means next week's.
    expect(quickDues("2026-10-17")[2]).toMatchObject({ label: "Next Friday", key: "2026-10-23" });
  });
});
