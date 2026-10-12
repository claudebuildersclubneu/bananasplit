import { describe, expect, it } from "vitest";

import { formatSemesterDate, nextSemesterStart } from "./semester";

const at = (iso: string) => new Date(iso);

describe("nextSemesterStart (placeholder semester calendar)", () => {
  it("renews for spring, on Jan 12 of the next year, from August through December", () => {
    for (const iso of ["2026-08-01T00:00:00Z", "2026-10-11T15:30:00Z", "2026-12-31T23:59:59Z"]) {
      const next = nextSemesterStart(at(iso));
      expect(next.season).toBe("spring");
      expect(next.date.toISOString()).toBe("2027-01-12T00:00:00.000Z");
    }
  });

  it("renews for fall, on Aug 25 of the same year, from January through July", () => {
    for (const iso of ["2027-01-01T00:00:00Z", "2027-03-15T12:00:00Z", "2027-07-31T23:59:59Z"]) {
      const next = nextSemesterStart(at(iso));
      expect(next.season).toBe("fall");
      expect(next.date.toISOString()).toBe("2027-08-25T00:00:00.000Z");
    }
  });

  it("rolls the year over at New Year", () => {
    expect(nextSemesterStart(at("2026-12-31T23:59:59Z")).date.getUTCFullYear()).toBe(2027);
    expect(nextSemesterStart(at("2027-01-01T00:00:00Z")).date.getUTCFullYear()).toBe(2027);
    expect(nextSemesterStart(at("2027-12-01T00:00:00Z")).date.getUTCFullYear()).toBe(2028);
  });

  it("decides by the UTC date, whatever the server's zone", () => {
    // Still Jul 31 in UTC (Aug 1 in Tokyo): fall.
    expect(nextSemesterStart(at("2026-07-31T20:00:00Z")).season).toBe("fall");
    // Already Aug 1 in UTC (Jul 31 in Los Angeles): spring.
    expect(nextSemesterStart(at("2026-08-01T03:00:00Z")).season).toBe("spring");
  });
});

describe("formatSemesterDate", () => {
  it("prints the design's short date", () => {
    expect(formatSemesterDate(nextSemesterStart(at("2026-10-11T00:00:00Z")).date)).toBe(
      "Jan 12, 2027",
    );
    expect(formatSemesterDate(nextSemesterStart(at("2027-02-01T00:00:00Z")).date)).toBe(
      "Aug 25, 2027",
    );
  });
});
