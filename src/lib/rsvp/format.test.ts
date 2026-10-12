import { describe, expect, it } from "vitest";

import { resolveRsvpBackground } from "./backgrounds";
import {
  formatPhone,
  initials,
  maskEmail,
  mapsSearchUrl,
  normalizePhone,
  placeRegistration,
  promotableCount,
  publicName,
  splitLocation,
  spotsLeft,
} from "./format";
import { registrationSchema } from "./schema";
import { dateTile, timeLine, whenLine } from "./when";

describe("who gets a spot", () => {
  const open = { capacity: 2, waitlist: true, closed: false };
  it("goes while there's room, then waitlists, or is full without a waitlist", () => {
    expect(placeRegistration(open, 0, false)).toEqual({ status: "GOING" });
    expect(placeRegistration(open, 2, false)).toEqual({ status: "WAITLIST" });
    expect(placeRegistration({ ...open, waitlist: false }, 2, false)).toEqual({ closed: "full" });
    expect(placeRegistration({ ...open, capacity: null }, 500, false)).toEqual({ status: "GOING" });
  });
  it("is closed by hand or once the event is over", () => {
    expect(placeRegistration({ ...open, closed: true }, 0, false)).toEqual({ closed: "closed" });
    expect(placeRegistration(open, 0, true)).toEqual({ closed: "ended" });
  });
  it("counts spots and who moves up", () => {
    expect(spotsLeft(null, 10)).toBeNull();
    expect(spotsLeft(5, 7)).toBe(0);
    expect(promotableCount(5, 3, 10)).toBe(2);
    expect(promotableCount(null, 3, 4)).toBe(4);
    expect(promotableCount(3, 5, 4)).toBe(0);
  });
});

describe("names, phones and emails", () => {
  it("shortens names for the public page", () => {
    expect(publicName("Maya Patel")).toBe("Maya P.");
    expect(publicName("  ivy   nine stone ")).toBe("ivy S.");
    expect(publicName("Cher")).toBe("Cher");
    expect(publicName("   ")).toBe("Guest");
    expect(initials("Maya Patel")).toBe("MP");
  });
  it("normalizes phone numbers to E.164 where it can", () => {
    expect(normalizePhone("(617) 555-0142")).toBe("+16175550142");
    expect(normalizePhone("1 617 555 0142")).toBe("+16175550142");
    expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
    expect(normalizePhone("555-01")).toBeNull();
    expect(normalizePhone("call me maybe")).toBeNull();
    expect(formatPhone("+16175550142")).toBe("(617) 555-0142");
  });
  it("masks an email and builds map links", () => {
    expect(maskEmail("maya@example.edu")).toBe("m•••@example.edu");
    expect(mapsSearchUrl("1 Main St, Boston")).toBe(
      "https://www.google.com/maps/search/?api=1&query=1%20Main%20St%2C%20Boston",
    );
    expect(splitLocation("Curry Ballroom, 346 Huntington Ave, Boston")).toEqual({
      venue: "Curry Ballroom",
      rest: "346 Huntington Ave, Boston",
    });
    expect(splitLocation("Room 204")).toEqual({ venue: "Room 204", rest: null });
  });
  it("accepts a sign-up of a name, an email and a phone, normalized", () => {
    expect(
      registrationSchema.parse({
        name: " Maya Patel ",
        email: " Maya@Example.EDU ",
        phone: "617-555-0142",
      }),
    ).toEqual({ name: "Maya Patel", email: "maya@example.edu", phone: "+16175550142" });
    expect(
      registrationSchema.safeParse({ name: "", email: "a@b.co", phone: "6175550142" }).success,
    ).toBe(false);
    expect(
      registrationSchema.safeParse({ name: "A", email: "nope", phone: "6175550142" }).success,
    ).toBe(false);
    expect(registrationSchema.safeParse({ name: "A", email: "a@b.co", phone: "12" }).success).toBe(
      false,
    );
  });
});

describe("dates in the club's timezone", () => {
  const start = new Date("2026-11-07T00:00:00Z"); // Fri Nov 6, 7:00 PM in New York
  const end = new Date("2026-11-07T03:00:00Z");
  it("names the zone and keeps one AM/PM when both share it", () => {
    expect(timeLine(start, end, "America/New_York")).toMatch(/^7:00 – 10:00\sPM EST$/);
    expect(whenLine(start, end, "America/New_York")).toMatch(
      /^Friday, November 6, 7:00 – 10:00\sPM EST$/,
    );
    expect(dateTile(start, "America/New_York")).toEqual({ month: "NOV", day: "6" });
  });
  it("says when it runs past midnight, and all day", () => {
    const late = new Date("2026-11-07T06:00:00Z");
    expect(timeLine(start, late, "America/New_York")).toMatch(/^7:00\sPM – Sat 1:00\sAM EST$/);
    expect(timeLine(start, end, "America/New_York", true)).toBe("All day");
  });
});

describe("backgrounds", () => {
  it("falls back to banana for an unknown one, or a cover background with no cover", () => {
    expect(resolveRsvpBackground("night", false)).toMatchObject({ id: "night", tone: "dark" });
    expect(resolveRsvpBackground("cover", false).id).toBe("banana");
    expect(resolveRsvpBackground("cover", true).id).toBe("cover");
    expect(resolveRsvpBackground("lava", true).id).toBe("banana");
  });
});
