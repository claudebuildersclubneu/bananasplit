import { describe, expect, it } from "vitest";

import {
  parseSidebarMode,
  serializeSidebarCookie,
  SIDEBAR_COOKIE_MAX_AGE,
  sidebarCookieName,
} from "./sidebar-mode";

describe("the sidebar mode cookie", () => {
  it("reads rail, and anything else as docked", () => {
    expect(parseSidebarMode("rail")).toBe("rail");
    expect(parseSidebarMode(" rail ")).toBe("rail");
    expect(parseSidebarMode("docked")).toBe("docked");
    expect(parseSidebarMode("peek")).toBe("docked");
    expect(parseSidebarMode("RAIL")).toBe("docked");
    expect(parseSidebarMode("")).toBe("docked");
    expect(parseSidebarMode(undefined)).toBe("docked");
    expect(parseSidebarMode(null)).toBe("docked");
  });

  it("names the cookie per member, stably, with cookie-safe characters", () => {
    const alice = sidebarCookieName("cmalice0000000000000000000");
    const bob = sidebarCookieName("cmbob000000000000000000000");
    expect(alice).toBe(sidebarCookieName("cmalice0000000000000000000"));
    expect(alice).not.toBe(bob);
    expect(alice).toMatch(/^sidebar_[0-9a-z]{1,7}$/);
    // The id itself never shows in the name.
    expect(alice).not.toContain("alice");
  });

  it("writes a year-long, site-wide, lax cookie, secure on https", () => {
    expect(serializeSidebarCookie("sidebar_x", "rail", false)).toBe(
      `sidebar_x=rail; Path=/; Max-Age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax`,
    );
    expect(serializeSidebarCookie("sidebar_x", "docked", true)).toMatch(/; Secure$/);
  });
});
