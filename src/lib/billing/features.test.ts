import { describe, expect, it } from "vitest";

import {
  FEATURE_LABELS,
  FEATURE_PITCH,
  PLAN_FEATURES,
  featuresOf,
  isOrgPlan,
  planFor,
  planIncludes,
  type PlanFeature,
} from "./features";

const ALL = Object.keys(PLAN_FEATURES) as PlanFeature[];

describe("what each plan includes", () => {
  it("gives Free (Personal) RSVP pages, tasks, polls and settings, and nothing for a team", () => {
    expect(featuresOf("FREE")).toEqual(["rsvp", "tasks", "taskViews", "polls", "admin"]);
    for (const f of ["teamwork", "files", "people", "finance", "databases", "overview"] as const) {
      expect(planIncludes("FREE", f)).toBe(false);
    }
  });

  it("gives Club the officer workspace but not the Society extras", () => {
    for (const f of [
      "overview",
      "teamwork",
      "files",
      "people",
      "finance",
      "databases",
      "reports",
      "integrations",
    ] as const) {
      expect(planIncludes("CLUB", f)).toBe(true);
    }
    for (const f of ["themes", "ai", "sponsorships", "websiteSync", "auditLog"] as const) {
      expect(planIncludes("CLUB", f)).toBe(false);
      expect(planIncludes("SOCIETY", f)).toBe(true);
    }
  });

  it("is ordered: every plan includes what the plans below it do", () => {
    expect(featuresOf("SOCIETY")).toEqual(ALL);
    for (const f of ALL) {
      if (planIncludes("FREE", f)) expect(planIncludes("CLUB", f)).toBe(true);
      if (planIncludes("CLUB", f)) expect(planIncludes("SOCIETY", f)).toBe(true);
      expect(planIncludes(planFor(f), f)).toBe(true);
    }
  });

  it("names and describes every feature for the upgrade screen", () => {
    for (const f of ALL) {
      expect(FEATURE_LABELS[f]).toBeTruthy();
      expect(FEATURE_PITCH[f]).toMatch(/\.$/);
    }
  });

  it("recognises the three priced plans and nothing else", () => {
    expect(["FREE", "CLUB", "SOCIETY"].every(isOrgPlan)).toBe(true);
    expect(isOrgPlan("TRIAL")).toBe(false);
    expect(isOrgPlan("PRO")).toBe(false);
    expect(isOrgPlan("free")).toBe(false);
    expect(isOrgPlan(undefined)).toBe(false);
  });
});
