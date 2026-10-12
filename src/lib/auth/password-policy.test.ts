import { describe, expect, it } from "vitest";

import { newPasswordSchema, passwordBytes } from "./password-policy";

describe("newPasswordSchema", () => {
  it("needs at least 8 characters", () => {
    expect(newPasswordSchema.safeParse("seven77").success).toBe(false);
    expect(newPasswordSchema.safeParse("eight888").success).toBe(true);
  });

  it("caps the length in bytes, where bcrypt stops reading", () => {
    expect(newPasswordSchema.safeParse("a".repeat(72)).success).toBe(true);
    expect(newPasswordSchema.safeParse("a".repeat(73)).success).toBe(false);
    // 30 emoji are 120 bytes: under 72 characters, but bcrypt would cut them.
    const emoji = "🍌".repeat(30);
    expect(passwordBytes(emoji)).toBe(120);
    expect(newPasswordSchema.safeParse(emoji).success).toBe(false);
  });
});
