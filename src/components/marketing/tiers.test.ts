import { describe, expect, it } from "vitest";

import { PERSONAL_PLUS, TIER_LIMITS, TIER_NAMES, perMemberRate } from "./tiers";

describe("pricing tiers", () => {
  it("say what the app enforces (guide 11.1)", () => {
    expect(TIER_NAMES).toEqual({
      free: "Personal Free",
      plus: "Personal Plus",
      club: "Team",
      society: "Team Advanced",
    });
    expect(TIER_LIMITS).toEqual({
      free: { storage: "1 GB", largestFile: "10 MB", noteHistory: "7 days", members: "1" },
      plus: { storage: "25 GB", largestFile: "250 MB", noteHistory: "1 year", members: "1" },
      club: {
        storage: "100 GB",
        largestFile: "250 MB",
        noteHistory: "90 days",
        members: "Unlimited",
      },
      society: {
        storage: "500 GB",
        largestFile: "1 GB",
        noteHistory: "1 year",
        members: "Unlimited",
      },
    });
    expect(PERSONAL_PLUS).toEqual({ perMonth: 4, perYear: 36 });
    expect([perMemberRate("club"), perMemberRate("society")]).toEqual([4, 7]);
  });
});
