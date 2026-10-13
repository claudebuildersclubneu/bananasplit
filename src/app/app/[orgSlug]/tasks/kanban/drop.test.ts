import { describe, expect, it } from "vitest";

import { TaskStatus } from "@/generated/prisma/enums";

import { planDrop } from "./drop";

const ids = (...xs: string[]) => xs.map((id) => ({ id }));
const board = {
  NOT_STARTED: ids("A", "B", "C"),
  IN_PROGRESS: ids("D", "E"),
  BLOCKED: ids(),
  COMPLETED: ids("F"),
};
const A = { id: "A", status: TaskStatus.NOT_STARTED };
const C = { id: "C", status: TaskStatus.NOT_STARTED };

describe("planDrop", () => {
  it("does nothing when a card is dropped on itself", () => {
    expect(planDrop(board, A, "A")).toBeNull();
  });

  it("dragging down within a column lands after the card it is over (A onto C gives B, C, A)", () => {
    expect(planDrop(board, A, "C")).toEqual({
      status: TaskStatus.NOT_STARTED,
      beforeId: "C",
      afterId: null,
    });
    expect(planDrop(board, A, "B")).toEqual({
      status: TaskStatus.NOT_STARTED,
      beforeId: "B",
      afterId: "C",
    });
  });

  it("dragging up within a column lands before the card it is over", () => {
    expect(planDrop(board, C, "A")).toEqual({
      status: TaskStatus.NOT_STARTED,
      beforeId: null,
      afterId: "A",
    });
    expect(planDrop(board, C, "B")).toEqual({
      status: TaskStatus.NOT_STARTED,
      beforeId: "A",
      afterId: "B",
    });
  });

  it("into another column, the card goes in front of the card it is over", () => {
    expect(planDrop(board, A, "E")).toEqual({
      status: TaskStatus.IN_PROGRESS,
      beforeId: "D",
      afterId: "E",
    });
    expect(planDrop(board, A, "D")).toEqual({
      status: TaskStatus.IN_PROGRESS,
      beforeId: null,
      afterId: "D",
    });
  });

  it("over a column's empty space, the card goes to the bottom", () => {
    expect(planDrop(board, A, TaskStatus.IN_PROGRESS)).toEqual({
      status: TaskStatus.IN_PROGRESS,
      beforeId: "E",
      afterId: null,
    });
    expect(planDrop(board, A, TaskStatus.BLOCKED)).toEqual({
      status: TaskStatus.BLOCKED,
      beforeId: null,
      afterId: null,
    });
    expect(planDrop(board, A, TaskStatus.NOT_STARTED)).toEqual({
      status: TaskStatus.NOT_STARTED,
      beforeId: "C",
      afterId: null,
    });
  });

  it("does nothing when the card is already where the drop would put it", () => {
    expect(planDrop(board, C, TaskStatus.NOT_STARTED)).toBeNull();
  });

  it("ignores a drop over something that is not on the board", () => {
    expect(planDrop(board, A, "nowhere")).toBeNull();
  });
});
