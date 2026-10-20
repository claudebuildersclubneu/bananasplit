import { describe, expect, it } from "vitest";

import { PLAN_FEATURES, type PlanFeature } from "./features";
import {
  canWriteSpace,
  effectivePlan,
  featureRefusal,
  isPaused,
  spaceIncludes,
  spaceLimits,
  spaceRefusal,
  spaceStatus,
  trialDaysLeft,
  trialEndsAtFrom,
  type SpaceInfo,
} from "./space";

const ALL = Object.keys(PLAN_FEATURES) as PlanFeature[];
const NOW = new Date("2026-10-13T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

const personal: SpaceInfo = { kind: "PERSONAL", plan: "FREE", trialEndsAt: null };
const plus: SpaceInfo = { kind: "PERSONAL", plan: "PERSONAL_PLUS", trialEndsAt: null };
const trial = (endsInDays: number): SpaceInfo => ({
  kind: "CLUB",
  plan: "TRIAL",
  trialEndsAt: new Date(NOW.getTime() + endsInDays * DAY),
});
const club: SpaceInfo = { kind: "CLUB", plan: "CLUB", trialEndsAt: null };
const society: SpaceInfo = { kind: "CLUB", plan: "SOCIETY", trialEndsAt: null };

describe("spaceIncludes", () => {
  it("gives both Personal plans tasks (every view), the calendar and RSVP pages, polls, notes and files, and settings", () => {
    for (const space of [personal, plus]) {
      for (const f of ["rsvp", "tasks", "taskViews", "polls", "admin", "files"] as const) {
        expect(spaceIncludes(space, f, NOW)).toBe(true);
      }
    }
  });

  it("gives Personal Plus themes, calendar sync and AI, and Personal Free none of them", () => {
    for (const f of ["themes", "integrations", "ai"] as const) {
      expect(spaceIncludes(plus, f, NOW)).toBe(true);
      expect(spaceIncludes(personal, f, NOW)).toBe(false);
    }
    expect(effectivePlan(plus)).toBe("PERSONAL_PLUS");
    expect(effectivePlan(personal)).toBe("FREE");
  });

  it("gives Personal Free nothing that needs a team", () => {
    for (const f of [
      "overview",
      "teamwork",
      "labels",
      "people",
      "finance",
      "databases",
      "reports",
      "integrations",
      "sidebar",
      "privacy",
      "themes",
      "ai",
      "sponsorships",
      "websiteSync",
      "auditLog",
    ] as const) {
      expect(spaceIncludes(personal, f, NOW)).toBe(false);
    }
  });

  it("gives a running trial everything (Society)", () => {
    for (const f of ALL) expect(spaceIncludes(trial(10), f, NOW)).toBe(true);
    expect(effectivePlan(trial(10))).toBe("SOCIETY");
  });

  it("keeps an ended trial readable but stops what runs on its own", () => {
    const ended = trial(-1);
    for (const f of ["finance", "people", "databases", "sponsorships", "auditLog"] as const) {
      expect(spaceIncludes(ended, f, NOW)).toBe(true);
    }
    expect(spaceIncludes(ended, "ai", NOW)).toBe(false);
    expect(spaceIncludes(ended, "websiteSync", NOW)).toBe(false);
  });

  it("follows a paid club's plan", () => {
    expect(spaceIncludes(club, "finance", NOW)).toBe(true);
    expect(spaceIncludes(club, "teamwork", NOW)).toBe(true);
    expect(spaceIncludes(club, "themes", NOW)).toBe(false);
    for (const f of ALL) expect(spaceIncludes(society, f, NOW)).toBe(true);
  });
});

describe("trials", () => {
  it("runs 30 days from the start", () => {
    expect(trialEndsAtFrom(NOW).getTime() - NOW.getTime()).toBe(30 * DAY);
  });

  it("is paused from the moment the trial ends, and only then", () => {
    expect(spaceStatus(trial(1), NOW)).toBe("trial");
    expect(spaceStatus(trial(0), NOW)).toBe("paused");
    expect(spaceStatus(trial(-5), NOW)).toBe("paused");
    expect(isPaused(trial(-5), NOW)).toBe(true);
    expect(canWriteSpace(trial(-5), NOW)).toBe(false);
    expect(canWriteSpace(trial(5), NOW)).toBe(true);
  });

  it("never pauses Personal or a paid club", () => {
    expect(spaceStatus(personal, NOW)).toBe("personal");
    expect(spaceStatus(club, NOW)).toBe("paid");
    expect(canWriteSpace(personal, NOW)).toBe(true);
    expect(canWriteSpace(society, NOW)).toBe(true);
  });

  it("counts the days left, rounding up, and none once it ends", () => {
    expect(trialDaysLeft(trial(30), NOW)).toBe(30);
    expect(trialDaysLeft(trial(0.5), NOW)).toBe(1);
    expect(trialDaysLeft(trial(-2), NOW)).toBe(0);
    expect(trialDaysLeft(club, NOW)).toBeNull();
    expect(trialDaysLeft(personal, NOW)).toBeNull();
  });
});

describe("spaceLimits", () => {
  it("follows the plan, and gives a trial (running or paused) Team Advanced's", () => {
    expect(spaceLimits(personal).storageBytes).toBe(1024 ** 3);
    expect(spaceLimits(plus).maxFileBytes).toBe(250 * 1024 ** 2);
    expect(spaceLimits(club).noteHistoryDays).toBe(90);
    expect(spaceLimits(trial(5))).toEqual(spaceLimits(society));
    expect(spaceLimits(trial(-5))).toEqual(spaceLimits(society));
  });
});

describe("spaceRefusal for notes and files", () => {
  it("lets Personal Free and Plus and every club in, and refuses writes in a paused club", () => {
    for (const space of [personal, plus, club, society, trial(3)]) {
      expect(spaceRefusal(space, { feature: "files" }, NOW)).toBeNull();
    }
    expect(spaceRefusal(trial(-1), { feature: "files" }, NOW)?.refused).toBe("paused");
    expect(spaceRefusal(trial(-1), { feature: "files", whenPaused: "allow" }, NOW)).toBeNull();
  });
});

describe("featureRefusal", () => {
  it("points Personal at clubs and names a club's plan otherwise, never a price", () => {
    expect(featureRefusal(personal, "finance")).toBe(
      "Finance is for clubs. Start a club or join one to use it.",
    );
    expect(featureRefusal(club, "themes")).toBe("Custom themes isn't on this club's plan.");
    expect(featureRefusal(personal, "themes")).toBe("Custom themes comes with Personal Plus.");
    expect(featureRefusal(club, "files")).toBe("Notes and files aren't on this club's plan.");
    expect(featureRefusal(club, "themes")).not.toMatch(/\$/);
  });
});
