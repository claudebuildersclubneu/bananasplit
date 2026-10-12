import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readRsvpManageKey, rsvpManageKey } from "./token";

describe("a guest's signed key", () => {
  const before = process.env.AUTH_SECRET;
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret-for-rsvp-keys";
  });
  afterEach(() => {
    process.env.AUTH_SECRET = before;
  });

  it("round-trips to the registration id", () => {
    const key = rsvpManageKey("cmabc123");
    expect(key).toMatch(/^cmabc123\.[A-Za-z0-9_-]{32}$/);
    expect(readRsvpManageKey(key)).toBe("cmabc123");
  });

  it("refuses a forged, edited or malformed key", () => {
    const key = rsvpManageKey("cmabc123");
    const mac = key.split(".")[1]!;
    expect(readRsvpManageKey(`cmother99.${mac}`)).toBeNull();
    expect(readRsvpManageKey(`cmabc123.${"A".repeat(32)}`)).toBeNull();
    expect(readRsvpManageKey("cmabc123")).toBeNull();
    expect(readRsvpManageKey(undefined)).toBeNull();
    process.env.AUTH_SECRET = "a-different-secret";
    expect(readRsvpManageKey(key)).toBeNull();
  });
});
