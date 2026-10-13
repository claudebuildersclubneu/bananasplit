import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Choice, FieldDef } from "@/lib/databases/fields";

/**
 * "Add a choice" in a choice cell picks the choice it adds (or the one
 * already named that), in a multi-select alongside what the cell has.
 */

// The popover measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const { CellEditor } = await import("./cell-editor");

const choices: Choice[] = [
  { id: "a", label: "Board", color: "blue" },
  { id: "b", label: "Alum", color: "gray" },
];
const tags: FieldDef = {
  id: "f_tags",
  name: "Tags",
  type: "MULTI_SELECT",
  options: { choices },
  isPrimary: false,
};

afterEach(cleanup);

async function addFromCell(field: FieldDef, value: unknown, label: string, returns: Choice) {
  const onSave = vi.fn();
  const onAddChoice = vi.fn(async () => returns);
  render(
    <CellEditor
      field={field}
      value={value}
      members={[]}
      canEdit
      canManage
      label="Tags for Maya"
      onSave={onSave}
      onAddChoice={onAddChoice}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Tags for Maya" }));
  fireEvent.change(screen.getByLabelText(`Add a choice to ${field.name}`), {
    target: { value: label },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Add choice" }));
  });
  expect(onAddChoice).toHaveBeenCalledWith(label);
  return onSave;
}

describe("adding a choice from a cell", () => {
  it("picks a new choice in a multi-select, keeping the ones already picked", async () => {
    const onSave = await addFromCell(tags, ["a"], "Treasurer", {
      id: "c",
      label: "Treasurer",
      color: "green",
    });
    expect(onSave).toHaveBeenCalledWith(["a", "c"]);
  });

  it("picks an existing choice by name instead of toggling it off", async () => {
    expect(await addFromCell(tags, ["a"], "alum", choices[1]!)).toHaveBeenCalledWith(["a", "b"]);
    cleanup();
    expect(await addFromCell(tags, ["a", "b"], "board", choices[0]!)).toHaveBeenCalledWith([
      "a",
      "b",
    ]);
  });

  it("sets a single select to the new choice", async () => {
    const status: FieldDef = { ...tags, name: "Status", type: "SELECT" };
    const onSave = await addFromCell(status, "a", "Waitlist", {
      id: "w",
      label: "Waitlist",
      color: "yellow",
    });
    expect(onSave).toHaveBeenCalledWith("w");
  });
});
