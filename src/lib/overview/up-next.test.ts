import { describe, expect, it } from "vitest";

import { arrangeUpNext, taskTone, type UpNextCandidate } from "./up-next";

const day = (d: number, h = 12) => new Date(Date.UTC(2026, 9, d, h));

function c(id: string, tone: UpNextCandidate["tone"], at: Date, kind: UpNextCandidate["kind"] = "task") {
  return { id, tone, at, kind };
}

const ids = (slots: { item: { id: string } }[]) => slots.map((s) => s.item.id);

describe("Up next ordering", () => {
  it("puts what needs you first: alerts, then answers, then quiet, each by time", () => {
    const slots = arrangeUpNext([
      c("meeting", "quiet", day(13), "meeting"),
      c("vote", "answer", day(16), "poll"),
      c("due", "alert", day(12)),
      c("rsvp", "answer", day(14), "rsvp"),
    ]);
    expect(ids(slots)).toEqual(["due", "rsvp", "vote", "meeting"]);
  });

  it("shows at most four", () => {
    const many = Array.from({ length: 7 }, (_, i) => c(`e${i}`, "quiet", day(10 + i), "event"));
    expect(ids(arrangeUpNext(many))).toEqual(["e0", "e1", "e2", "e3"]);
  });

  it("never puts two alerts side by side", () => {
    const slots = arrangeUpNext([
      c("late", "alert", day(9)),
      c("today", "alert", day(12)),
      c("meeting", "quiet", day(13), "meeting"),
      c("event", "quiet", day(15), "event"),
    ]);
    expect(ids(slots)).toEqual(["late", "meeting", "today", "event"]);
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].item.tone === "alert" && slots[i - 1].item.tone === "alert").toBe(false);
    }
  });

  it("counts the alerts that don't fit on the last alert shown", () => {
    const slots = arrangeUpNext([
      c("a1", "alert", day(8)),
      c("a2", "alert", day(9)),
      c("a3", "alert", day(10)),
      c("a4", "alert", day(11)),
      c("q", "quiet", day(14), "meeting"),
    ]);
    expect(ids(slots)).toEqual(["a1", "q", "a2"]);
    expect(slots.map((s) => s.moreAlerts)).toEqual([0, 0, 2]);
  });

  it("keeps one alert when it is all there is", () => {
    const slots = arrangeUpNext([c("a1", "alert", day(8)), c("a2", "alert", day(9))]);
    expect(ids(slots)).toEqual(["a1"]);
    expect(slots[0].moreAlerts).toBe(1);
    expect(arrangeUpNext([])).toEqual([]);
  });

  it("makes a task an alert when it's due today or overdue", () => {
    expect(taskTone("2026-10-12", "2026-10-12")).toBe("alert");
    expect(taskTone("2026-10-01", "2026-10-12")).toBe("alert");
    expect(taskTone("2026-10-13", "2026-10-12")).toBe("quiet");
    expect(taskTone(null, "2026-10-12")).toBe("quiet");
  });
});
