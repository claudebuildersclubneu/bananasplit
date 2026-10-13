import { generateKeyBetween } from "fractional-indexing";
import { describe, expect, it } from "vitest";

import { TaskStatus } from "@/generated/prisma/enums";

import { compareBoardOrder, compareRank, placeInColumn } from "./rank";

describe("compareRank", () => {
  it("sorts keys in the order fractional-indexing generates them, case included", () => {
    const top = generateKeyBetween(null, "a0"); // "Zz": goes above "a0"
    const mid = generateKeyBetween("a0", "a1"); // "a0V"
    const lower = generateKeyBetween(mid, "a1"); // "a0l"
    const keys = ["a1", lower, "a0", mid, top];
    expect(keys.sort(compareRank)).toEqual([top, "a0", mid, lower, "a1"]);
  });
});

describe("compareBoardOrder", () => {
  it("groups by column, then rank, then id so shared ranks keep a stable order", () => {
    const t = (id: string, status: TaskStatus, rank: string) => ({ id, status, rank });
    const tasks = [
      t("z", TaskStatus.NOT_STARTED, "a0"),
      t("c", TaskStatus.COMPLETED, "a0"),
      t("a", TaskStatus.NOT_STARTED, "a0"),
      t("b", TaskStatus.NOT_STARTED, "Zz"),
      t("i", TaskStatus.IN_PROGRESS, "a5"),
    ];
    expect(tasks.sort(compareBoardOrder).map((x) => x.id)).toEqual(["b", "a", "z", "i", "c"]);
  });
});

describe("placeInColumn", () => {
  const column = ["A", "B", "C"];

  it("puts the card right after the card above it", () => {
    expect(placeInColumn(column, "X", "A", "B")).toEqual(["A", "X", "B", "C"]);
    expect(placeInColumn(column, "X", "C", null)).toEqual(["A", "B", "C", "X"]);
  });

  it("puts the card right before the card below it when it lands on top", () => {
    expect(placeInColumn(column, "X", null, "A")).toEqual(["X", "A", "B", "C"]);
  });

  it("moves a card within its own column", () => {
    expect(placeInColumn(column, "A", "C", null)).toEqual(["B", "C", "A"]);
    expect(placeInColumn(column, "C", null, "A")).toEqual(["C", "A", "B"]);
  });

  it("falls back to the bottom when the neighbours have gone", () => {
    expect(placeInColumn(column, "X", "gone", null)).toEqual(["A", "B", "C", "X"]);
    expect(placeInColumn(column, "X", null, null)).toEqual(["A", "B", "C", "X"]);
  });
});
