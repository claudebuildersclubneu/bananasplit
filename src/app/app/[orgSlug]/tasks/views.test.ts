import { describe, expect, it } from "vitest";

import { parseRememberedLayout, parseWorkspaceQuery } from "./views";

describe("the remembered Tasks view", () => {
  it("is only ever a layout", () => {
    expect(parseRememberedLayout("table")).toBe("table");
    expect(parseRememberedLayout("mine")).toBe("week");
    expect(parseRememberedLayout("updates")).toBeNull();
    expect(parseRememberedLayout("intake")).toBeNull();
  });

  it("does not reopen Tasks on the Sunday update or the request queue", () => {
    expect(parseWorkspaceQuery({}, "updates").view).toBe("board");
    expect(parseWorkspaceQuery({}, "intake").view).toBe("board");
    expect(parseWorkspaceQuery({}, "week").view).toBe("week");
  });

  it("still opens a destination asked for in the link", () => {
    expect(parseWorkspaceQuery({ view: "updates" }, "table").view).toBe("updates");
  });
});
