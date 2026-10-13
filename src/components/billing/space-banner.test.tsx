import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { SpaceInfo } from "@/lib/billing/space";

import { SpaceBanner } from "./space-banner";

const NOW = new Date("2026-10-13T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const trial = (days: number): SpaceInfo => ({
  kind: "CLUB",
  plan: "TRIAL",
  trialEndsAt: new Date(NOW.getTime() + days * DAY),
});

function render(space: SpaceInfo, canChoosePlan: boolean) {
  return renderToStaticMarkup(
    <SpaceBanner space={space} orgSlug="cbc" canChoosePlan={canChoosePlan} now={NOW} />,
  ).replace(/&#x27;/g, "'");
}

describe("SpaceBanner", () => {
  it("asks owners and admins of a paused club to choose a plan", () => {
    const html = render(trial(-1), true);
    expect(html).toContain("free trial has ended");
    expect(html).toContain('href="/app/cbc/settings/plan"');
    expect(html).toContain("Choose a plan");
  });

  it("tells members of a paused club, calmly, with no price, trial link or button", () => {
    const html = render(trial(-1), false);
    expect(html).toContain("This club is paused for now. Your officers have been asked");
    expect(html).not.toContain("settings/plan");
    expect(html).not.toMatch(/\$|trial/i);
  });

  it("warns owners and admins in a trial's last week, and nobody else", () => {
    expect(render(trial(3), true)).toContain("ends in 3 days");
    expect(render(trial(1), true)).toContain("ends in 1 day.");
    expect(render(trial(3), false)).toBe("");
    expect(render(trial(20), true)).toBe("");
  });

  it("says nothing in Personal or a paid club", () => {
    expect(render({ kind: "PERSONAL", plan: "FREE", trialEndsAt: null }, true)).toBe("");
    expect(render({ kind: "CLUB", plan: "SOCIETY", trialEndsAt: null }, true)).toBe("");
  });
});
