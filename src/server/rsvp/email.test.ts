import { describe, expect, it } from "vitest";

import { guestPlace, rsvpEmail, rsvpText, type RsvpMessageInput } from "./email";

const event = {
  location: "Engineering Hall 112, 1 Main St",
  locationDetails: "Second floor, east wing.",
  joinUrl: "https://meet.example.com/robot-demo",
};

function message(template: RsvpMessageInput["template"], going: boolean, hideLocation: boolean) {
  return {
    template,
    guestName: "Maya Patel",
    orgName: "Robotics Club",
    title: "Robot demo night",
    when: "Thursday, October 15, 6:00 – 8:00 PM EDT",
    startTime: "6:00 PM",
    pageUrl: "https://bananasplit.test/e/abcdefgh/manage?key=k",
    ...guestPlace({ ...event, hideLocation }, going),
  } satisfies RsvpMessageInput;
}

describe("where an RSVP email says the event is", () => {
  it("tells someone going everything", () => {
    expect(guestPlace({ ...event, hideLocation: true }, true)).toEqual(event);
  });

  it("keeps the meeting link from the waitlist, and the address when the host hides it", () => {
    expect(guestPlace({ ...event, hideLocation: true }, false)).toEqual({
      location: null,
      locationDetails: null,
      joinUrl: null,
    });
    // An address the host shows anyone is fine; the link still isn't.
    expect(guestPlace({ ...event, hideLocation: false }, false)).toEqual({
      location: event.location,
      locationDetails: event.locationDetails,
      joinUrl: null,
    });
  });

  it("leaves a hidden address and the link out of the waitlist email", () => {
    const email = rsvpEmail(message("waitlisted", false, true));
    for (const body of [email.html, email.text]) {
      expect(body).not.toContain("Engineering Hall");
      expect(body).not.toContain("east wing");
      expect(body).not.toContain("meet.example.com");
    }
  });

  it("puts them in the reminder of someone going", () => {
    const input = message("reminder-hour", true, true);
    const email = rsvpEmail(input);
    expect(email.text).toContain("Engineering Hall");
    expect(email.text).toContain("east wing");
    expect(email.text).toContain("meet.example.com");
    expect(rsvpText(input)).toContain("at Engineering Hall 112");
  });
});
