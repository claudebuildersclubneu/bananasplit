import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A guest's key to their own sign-up on a public RSVP page: the
 * registration id and an HMAC of it (AUTH_SECRET), "{id}.{mac}". It is what
 * their browser's cookie holds and what the links in their emails carry, so
 * any of them opens "You're going" with Cancel on the page. Nothing is
 * stored: the server recomputes the MAC. Server-only.
 */

export const RSVP_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/** One cookie per event, scoped to its page (where the actions post). */
export function rsvpCookieName(eventId: string): string {
  return `rsvp_${eventId}`;
}

export function rsvpCookiePath(slug: string): string {
  return `/e/${slug}`;
}

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is required to sign RSVP keys");
  return value;
}

function mac(registrationId: string): string {
  return createHmac("sha256", secret())
    .update(`rsvp-manage:${registrationId}`)
    .digest("base64url")
    .slice(0, 32);
}

export function rsvpManageKey(registrationId: string): string {
  return `${registrationId}.${mac(registrationId)}`;
}

const KEY = /^([A-Za-z0-9_-]{1,64})\.([A-Za-z0-9_-]{32})$/;

/** The registration id a well-signed key is for, or null. */
export function readRsvpManageKey(value: string | null | undefined): string | null {
  const m = KEY.exec(value ?? "");
  if (!m) return null;
  const [, id, given] = m;
  const expected = Buffer.from(mac(id!));
  const actual = Buffer.from(given!);
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? id! : null;
}
