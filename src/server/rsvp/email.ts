import { escapeHtml, safeHref } from "@/server/email/escape";
import { layout, paragraph, type RenderedEmail } from "@/server/email/templates";
import { mapsSearchUrl } from "@/lib/rsvp/format";

import type { RsvpEmailTemplate } from "./service";

/**
 * The emails a guest gets from an RSVP page, and the reminder text. Every
 * value is escaped by the shared layout helpers; links are absolute
 * (appUrl) and passed through safeHref.
 */

export interface RsvpMessageInput {
  template: RsvpEmailTemplate;
  guestName: string;
  orgName: string;
  title: string;
  /** "Thursday, October 15, 6:00 – 7:00 PM EDT". */
  when: string;
  /** "6:00 PM", for the hour-before text. */
  startTime: string;
  location: string | null;
  locationDetails: string | null;
  /** The online meeting link, if the event has one. */
  joinUrl: string | null;
  /** The page, signed in as this guest (their manage link). */
  pageUrl: string;
}

const COPY: Record<
  RsvpEmailTemplate,
  { subject: (title: string) => string; lead: (i: RsvpMessageInput) => string; cta: string }
> = {
  registered: {
    subject: (t) => `You're going: ${t}`,
    lead: (i) => `You're on the list for ${i.title}. See you there!`,
    cta: "View your RSVP",
  },
  waitlisted: {
    subject: (t) => `You're on the waitlist: ${t}`,
    lead: (i) =>
      `${i.title} is full right now, so you're on the waitlist. If a spot opens up, it's yours and we'll email you straight away.`,
    cta: "View your RSVP",
  },
  promoted: {
    subject: (t) => `A spot opened up: you're going to ${t}`,
    lead: (i) => `Good news: a spot opened up at ${i.title}, and it's yours. You're going.`,
    cta: "View your RSVP",
  },
  "reminder-day": {
    subject: (t) => `Tomorrow: ${t}`,
    lead: (i) => `A reminder that ${i.title} is tomorrow.`,
    cta: "View event",
  },
  "reminder-hour": {
    subject: (t) => `Starting soon: ${t}`,
    lead: (i) => `${i.title} starts at ${i.startTime}. Here's how to find it.`,
    cta: "View event",
  },
  "event-cancelled": {
    subject: (t) => `Cancelled: ${t}`,
    lead: (i) =>
      `${i.orgName} cancelled ${i.title}. You don't need to do anything; we're sorry for the change of plans.`,
    cta: "",
  },
};

function detailRow(label: string, valueHtml: string): string {
  return `<tr><td style="padding:6px 12px 6px 0;vertical-align:top;font-size:12px;color:#7a6e58;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:6px 0;vertical-align:top">${valueHtml}</td></tr>`;
}

export function rsvpEmail(input: RsvpMessageInput): RenderedEmail {
  const copy = COPY[input.template];
  const cancelled = input.template === "event-cancelled";
  const rows: string[] = [detailRow("When", escapeHtml(input.when))];
  const text: string[] = [`When: ${input.when}`];
  if (input.location) {
    rows.push(
      detailRow(
        "Where",
        `${escapeHtml(input.location)}<br><a href="${safeHref(mapsSearchUrl(input.location))}" style="color:#7a5a00">Open in Google Maps</a>`,
      ),
    );
    text.push(`Where: ${input.location} (${mapsSearchUrl(input.location)})`);
  }
  if (input.locationDetails && !cancelled) {
    rows.push(detailRow("Finding it", escapeHtml(input.locationDetails).replace(/\n/g, "<br>")));
    text.push(`Finding it: ${input.locationDetails}`);
  }
  if (input.joinUrl && !cancelled) {
    rows.push(
      detailRow(
        "Online",
        `<a href="${safeHref(input.joinUrl)}" style="color:#7a5a00">Join the meeting</a>`,
      ),
    );
    text.push(`Online: ${input.joinUrl}`);
  }

  const details = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;width:100%;background:#f7f2e6;border-radius:12px"><tr><td style="padding:12px 16px"><table role="presentation" cellpadding="0" cellspacing="0">${rows.join("")}</table></td></tr></table>`;
  const greeting = `Hi ${input.guestName.trim().split(/\s+/)[0] || "there"},`;

  return layout({
    subject: copy.subject(input.title),
    eyebrow: input.orgName,
    bodyHtml: [
      `<h1 style="margin:0 0 12px;font-size:22px;line-height:1.25">${escapeHtml(input.title)}</h1>`,
      paragraph(greeting),
      paragraph(copy.lead(input)),
      details,
    ].join(""),
    bodyText: [input.title, greeting, copy.lead(input), text.join("\n")].join("\n\n"),
    cta: cancelled ? undefined : { label: copy.cta, url: input.pageUrl },
    footer: `You're getting this because you signed up for ${input.title} with ${input.orgName}. To cancel, open the event page and choose "Can't go".`,
  });
}

/** The reminder text (reminders only; the rest are email). */
export function rsvpText(input: RsvpMessageInput): string | null {
  const where = input.location ? ` at ${input.location}` : input.joinUrl ? " online" : "";
  if (input.template === "reminder-day") {
    return `Reminder: ${input.title} is tomorrow, ${input.when}${where}. Details: ${input.pageUrl}`;
  }
  if (input.template === "reminder-hour") {
    const directions = input.locationDetails ? ` ${input.locationDetails}` : "";
    return `${input.title} starts at ${input.startTime}${where}.${directions} Details: ${input.pageUrl}`;
  }
  return null;
}
