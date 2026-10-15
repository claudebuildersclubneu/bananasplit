import { allDaySpan } from "@/lib/calendar/dates";

/**
 * Pure rules and formatting for public RSVP pages (docs/features/rsvp.md):
 * who gets a spot, what the page shows, phone numbers and names. No I/O, so
 * the page, the server actions and the suite share them, and they are unit
 * tested on their own. Client-safe.
 */

export type RegistrationState = "GOING" | "WAITLIST" | "CANCELLED";

export interface CapacityRules {
  /** Going spots; null is unlimited. */
  capacity: number | null;
  waitlist: boolean;
  closed: boolean;
}

/** Why a page takes no sign-ups right now, or null when it does. */
export type ClosedReason = "ended" | "closed" | "full";

/**
 * Where a new sign-up lands: going while there is a spot, the waitlist when
 * the event is full and has one, or nowhere (registration is closed, the
 * event has ended, or it is full without a waitlist).
 */
export function placeRegistration(
  rules: CapacityRules,
  goingCount: number,
  ended: boolean,
): { status: "GOING" | "WAITLIST" } | { closed: ClosedReason } {
  if (ended) return { closed: "ended" };
  if (rules.closed) return { closed: "closed" };
  if (rules.capacity === null || goingCount < rules.capacity) return { status: "GOING" };
  if (rules.waitlist) return { status: "WAITLIST" };
  return { closed: "full" };
}

/** Spots still open, or null when unlimited. Never negative. */
export function spotsLeft(capacity: number | null, goingCount: number): number | null {
  if (capacity === null) return null;
  return Math.max(0, capacity - goingCount);
}

/**
 * How many waitlisted guests move up when a spot frees or capacity grows:
 * everyone when unlimited, else the open spots (never more than are waiting).
 */
export function promotableCount(
  capacity: number | null,
  goingCount: number,
  waitingCount: number,
): number {
  if (capacity === null) return waitingCount;
  return Math.min(waitingCount, Math.max(0, capacity - goingCount));
}

/** One or two initials for an avatar. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * A phone number as stored: E.164 when it parses. Ten digits are a US/Canada
 * number (+1), eleven starting with 1 too; anything typed with a leading +
 * keeps its country code. Returns null when it can't be a phone number
 * (fewer than 7 or more than 15 digits).
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || /[^0-9+()\-.\s]/.test(trimmed)) return null;
  const plus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  if (plus) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits;
}

/** +15551234567 -> (555) 123-4567; other numbers as stored. */
export function formatPhone(phone: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(phone);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : phone;
}

/** "maya@example.edu" -> "m•••@example.edu", for "we emailed ..." lines. */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return email;
  return `${email[0]}•••${email.slice(at)}`;
}

/** Google Maps search for an address (opens the app on phones). */
export function mapsSearchUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

/** The embeddable map for an address (no API key; frame-src allows google.com). */
export function mapsEmbedUrl(location: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(location)}&output=embed`;
}

/** "Student Union 204, 1 Main St" -> ["Student Union 204", "1 Main St"]: a venue and the rest. */
export function splitLocation(location: string): { venue: string; rest: string | null } {
  const lines = location
    .split(/\n|,(?=\s)/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length <= 1) return { venue: location.trim(), rest: null };
  return { venue: lines[0]!, rest: lines.slice(1).join(", ") };
}

/**
 * Google Calendar's "add event" link. An all-day event goes in as dates
 * (YYYYMMDD/YYYYMMDD, the end the day after its last), so Google shows it
 * as all day on the club's dates rather than midnight to midnight.
 */
export function googleCalendarUrl(event: {
  title: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  /** The club's timezone, which an all-day event's dates are in. */
  timeZone: string;
  details?: string | null;
  location?: string | null;
}): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  let dates = `${fmt(event.startsAt)}/${fmt(event.endsAt)}`;
  if (event.allDay) {
    const span = allDaySpan(event.startsAt, event.endsAt, event.timeZone);
    dates = `${span.start.replace(/-/g, "")}/${span.endExclusive.replace(/-/g, "")}`;
  }
  const params = new URLSearchParams({ action: "TEMPLATE", text: event.title, dates });
  if (event.details) params.set("details", event.details);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** The brand tones initials avatars cycle through, picked by the name. */
const AVATAR_TONES = [
  "bg-banana text-banana-ink",
  "bg-wheat text-ink",
  "bg-butter text-honey",
  "bg-ink text-cream",
  "bg-pine text-cream",
  "bg-straw text-ink",
  "bg-navy text-cream",
  "bg-brick text-cream",
] as const;

export function avatarTone(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length]!;
}

/** The ticket code in a scanned QR (/e/{slug}/t/{code}), or null. */
export function ticketCodeFrom(raw: string): string | null {
  const m = /\/t\/([a-z0-9]{12})(?:[/?#]|$)/.exec(raw.trim());
  return m ? m[1]! : null;
}

/**
 * What a ticket scanned in door mode does: checks a going guest in, or
 * stops to say why not. A waitlisted guest's ticket isn't a spot, so the
 * host decides (tapping their name checks them in anyway).
 */
export function doorScan<G extends { ticketCode: string; status: string; checkedIn: boolean }>(
  guests: readonly G[],
  raw: string,
): { kind: "unknown" } | { kind: "already" | "waitlist" | "check-in"; guest: G } {
  const code = ticketCodeFrom(raw);
  const guest = code ? guests.find((g) => g.ticketCode === code) : undefined;
  if (!guest) return { kind: "unknown" };
  if (guest.checkedIn) return { kind: "already", guest };
  if (guest.status === "WAITLIST") return { kind: "waitlist", guest };
  return { kind: "check-in", guest };
}

/** A name as the guest list shows it: in full, with the spacing tidied. */
export function displayName(name: string): string {
  return name.trim().replace(/\s+/g, " ") || "Guest";
}

const INSTAGRAM_HANDLE = /^[A-Za-z0-9._]{1,30}$/;

/**
 * An Instagram handle from whatever a guest typed: "maya.chen",
 * "@maya.chen" or a profile link ("instagram.com/maya.chen/"). Empty is
 * null (they'd rather not); anything else that isn't a handle is undefined.
 */
export function normalizeInstagram(input: string): string | null | undefined {
  const raw = input.trim();
  if (!raw) return null;
  const fromUrl = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#\s]+)\/?(?:[?#].*)?$/i.exec(
    raw,
  );
  const handle = (fromUrl ? fromUrl[1]! : raw).replace(/^@/, "");
  return INSTAGRAM_HANDLE.test(handle) ? handle : undefined;
}

/** The profile behind a handle. */
export function instagramUrl(handle: string): string {
  return `https://www.instagram.com/${encodeURIComponent(handle)}/`;
}
