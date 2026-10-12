import { describe, expect, it } from "vitest";

import { passwordStrength } from "./password-strength";

describe("passwordStrength", () => {
  it("shows nothing before anything is typed", () => {
    expect(passwordStrength("")).toEqual({ score: 0, label: "" });
  });

  it("calls anything under the minimum too short", () => {
    expect(passwordStrength("Ab3!")).toEqual({ score: 1, label: "Too short" });
  });

  it("rates a long-enough password by its length and mix", () => {
    expect(passwordStrength("bananasplit")).toEqual({ score: 2, label: "Good" });
    expect(passwordStrength("bananas1")).toEqual({ score: 1, label: "Weak" });
    expect(passwordStrength("Bananas1")).toEqual({ score: 2, label: "Good" });
    expect(passwordStrength("Banana split 26")).toEqual({ score: 3, label: "Strong" });
  });
});
