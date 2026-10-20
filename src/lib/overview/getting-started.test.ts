import { describe, expect, it } from "vitest";

import { STARTED_STEP_KEYS, startedProgress, type StartedState } from "./getting-started";

const none = Object.fromEntries(STARTED_STEP_KEYS.map((k) => [k, false])) as StartedState;

describe("get your club started", () => {
  it("counts what the club has and what it checked off", () => {
    const p = startedProgress({ ...none, name: true, event: true }, ["database"]);
    expect(p.finished).toBe(3);
    expect(p.total).toBe(STARTED_STEP_KEYS.length);
    expect(p.complete).toBe(false);
    expect(p.steps.find((s) => s.key === "database")?.status).toBe("skipped");
    expect(p.steps.find((s) => s.key === "budget")?.status).toBe("todo");
  });

  it("is complete once every step is done or checked off", () => {
    const done = { ...none, name: true, picture: true, members: true, event: true, task: true };
    expect(startedProgress(done, ["budget"]).complete).toBe(false);
    expect(startedProgress(done, ["budget", "database"]).complete).toBe(true);
  });

  it("prefers done over checked off, and ignores unknown keys", () => {
    const p = startedProgress({ ...none, budget: true }, ["budget", "sections"]);
    expect(p.steps.find((s) => s.key === "budget")?.status).toBe("done");
    expect(p.finished).toBe(1);
  });

  it("no longer asks a club to pick its sections", () => {
    expect(STARTED_STEP_KEYS).not.toContain("sections" as never);
  });
});
