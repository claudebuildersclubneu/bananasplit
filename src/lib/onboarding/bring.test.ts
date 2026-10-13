import { describe, expect, it } from "vitest";

import { bringSections, bringSelection, moveLabel, type BringableIn } from "./bring";

const base: BringableIn = {
  space: { timezone: "America/Chicago" },
  rsvpEvents: [
    {
      id: "e1",
      title: "Picnic",
      startsAt: new Date("2026-10-18T00:00:00Z"),
      allDay: false,
      rsvp: true,
      going: 12,
      past: false,
    },
  ],
  events: [],
  polls: [
    { id: "p1", title: "When?", kind: "availability", responses: 1, finalizedEventId: "e9" },
    { id: "q1", title: "Tacos?", kind: "question", responses: 3, finalizedEventId: null },
  ],
  taskGroups: [
    { project: null, tasks: [{ id: "t1", title: "Book", dueDate: null, subtasks: 2 }] },
    {
      project: "Errands",
      tasks: [{ id: "t2", title: "Shop", dueDate: new Date("2026-10-20T15:00:00Z"), subtasks: 0 }],
    },
  ],
};

describe("bringSections", () => {
  it("leaves out empty sections and describes each item in the space's time zone", () => {
    const sections = bringSections(base);
    expect(sections.map((s) => s.key)).toEqual(["rsvp", "polls", "tasks"]);
    expect(sections[0].groups[0].items[0]).toEqual({
      id: "e1",
      kind: "event",
      title: "Picnic",
      // 00:00 UTC is 7 PM the evening before in Chicago.
      meta: "Sat, Oct 17, 7:00 PM · 12 going",
    });
    expect(sections[1].groups[0].items.map((i) => i.meta)).toEqual([
      "Availability poll · 1 response · its event comes too",
      "Question poll · 3 votes",
    ]);
    expect(sections[2].groups.map((g) => [g.label, g.items.map((i) => i.meta)])).toEqual([
      [null, ["2 subtasks come too"]],
      ["Errands", ["Due Oct 20"]],
    ]);
  });
});

describe("bringSelection", () => {
  it("splits the ticked ids by kind", () => {
    const items = bringSections(base).flatMap((s) => s.groups.flatMap((g) => g.items));
    expect(bringSelection(items, new Set(["e1", "q1", "t2", "nope"]))).toEqual({
      eventIds: ["e1"],
      pollIds: [],
      questionPollIds: ["q1"],
      taskIds: ["t2"],
    });
  });
});

describe("moveLabel", () => {
  it("counts items", () => {
    expect(moveLabel(1, "Chess Club")).toBe("Move 1 item into Chess Club");
    expect(moveLabel(3, "Chess Club")).toBe("Move 3 items into Chess Club");
  });
});
