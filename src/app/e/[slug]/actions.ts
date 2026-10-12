"use server";

import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { registrationSchema } from "@/lib/rsvp/schema";
import { withSystemOrgTx } from "@/server/db/context";
import { rsvpPageTarget } from "@/server/rsvp/page";
import { registerGuest, RSVP_RULES_SELECT, setRegistrationStatus } from "@/server/rsvp/service";
import {
  readRsvpManageKey,
  RSVP_COOKIE_MAX_AGE_SECONDS,
  rsvpCookieName,
  rsvpCookiePath,
  rsvpManageKey,
} from "@/server/rsvp/token";

/**
 * The public RSVP page's actions. No org-context guard: anyone with the
 * link signs up. They run on the service path for the page's own event
 * (found through app.rsvp_page), rate limited per address; the guest's
 * browser then holds their signed key (an httpOnly cookie on /e/{slug}).
 */

export type RegisterResult =
  | { ok: true; status: "GOING" | "WAITLIST" }
  /** That email is already signed up: we emailed its owner a link. */
  | { ok: true; status: "EXISTS" }
  | { ok: false; error: string; field?: "name" | "email" | "phone" };

// Generous: a whole room on one campus network signs up at once.
const REGISTER_LIMIT = { limit: 60, windowSec: 10 * 60 };
const CANCEL_LIMIT = { limit: 60, windowSec: 10 * 60 };

const CLOSED_MESSAGE = {
  ended: "This event has already ended.",
  closed: "Registration is closed for this event.",
  full: "This event is full.",
  off: "This page isn't taking sign-ups.",
} as const;

const inputSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]{8}$/),
  name: z.string().max(200),
  email: z.string().max(400),
  phone: z.string().max(64),
  /** A field people never see; bots fill it in. */
  website: z.string().max(200).optional(),
});

const SOMETHING_WRONG = "Something went wrong on our side. Try again in a moment.";

/** Unexpected failures become a message on the card, never a crash. */
async function guarded<T>(label: string, fallback: T, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    unstable_rethrow(error);
    console.error(`[rsvp] ${label} failed`, error);
    return fallback;
  }
}

export async function registerForEvent(input: unknown): Promise<RegisterResult> {
  return guarded("sign-up", { ok: false, error: SOMETHING_WRONG }, () => register(input));
}

async function register(input: unknown): Promise<RegisterResult> {
  const raw = inputSchema.safeParse(input);
  if (!raw.success)
    return { ok: false, error: "Something's off with that form. Reload and try again." };
  if (raw.data.website) {
    // Looks like success to a bot, does nothing.
    return { ok: true, status: "GOING" };
  }

  const limited = await checkRateLimit(
    rateLimitKey("rsvp-register", await getClientIp()),
    REGISTER_LIMIT.limit,
    REGISTER_LIMIT.windowSec,
  );
  if (!limited.allowed)
    return { ok: false, error: "Too many sign-ups from here. Wait a few minutes and try again." };

  const parsed = registrationSchema.safeParse(raw.data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    return {
      ok: false,
      error: issue?.message ?? "Check the form and try again.",
      field: field === "name" || field === "email" || field === "phone" ? field : undefined,
    };
  }

  const target = await rsvpPageTarget(raw.data.slug);
  if (!target) return { ok: false, error: CLOSED_MESSAGE.off };
  const session = await getSession();

  const outcome = await withSystemOrgTx(target.organizationId, async ({ db }) => {
    const event = await db.event.findFirst({
      where: { id: target.eventId, organizationId: target.organizationId },
      select: RSVP_RULES_SELECT,
    });
    if (!event) return { kind: "closed" as const, reason: "off" as const };
    return registerGuest(db, event, { ...parsed.data, userId: session?.user.id ?? null });
  });

  if (outcome.kind === "closed") return { ok: false, error: CLOSED_MESSAGE[outcome.reason] };
  if (outcome.kind === "exists") return { ok: true, status: "EXISTS" };

  (await cookies()).set(rsvpCookieName(target.eventId), rsvpManageKey(outcome.registrationId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: rsvpCookiePath(raw.data.slug),
    maxAge: RSVP_COOKIE_MAX_AGE_SECONDS,
  });
  return { ok: true, status: outcome.status };
}

/** "Can't go": cancels the sign-up this browser holds; the next in line gets the spot. */
export async function cancelMyRegistration(
  input: unknown,
): Promise<{ ok: boolean; error?: string }> {
  return guarded("cancel", { ok: false, error: SOMETHING_WRONG }, () => cancel(input));
}

async function cancel(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = z.object({ slug: z.string().regex(/^[a-z0-9]{8}$/) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Reload the page and try again." };

  const limited = await checkRateLimit(
    rateLimitKey("rsvp-cancel", await getClientIp()),
    CANCEL_LIMIT.limit,
    CANCEL_LIMIT.windowSec,
  );
  if (!limited.allowed) return { ok: false, error: "Too many tries. Wait a few minutes." };

  const target = await rsvpPageTarget(parsed.data.slug);
  if (!target) return { ok: false, error: CLOSED_MESSAGE.off };
  const store = await cookies();
  const registrationId = readRsvpManageKey(store.get(rsvpCookieName(target.eventId))?.value);
  if (!registrationId) return { ok: false, error: "We couldn't find your sign-up on this device." };

  const done = await withSystemOrgTx(target.organizationId, async ({ db }) => {
    const event = await db.event.findFirst({
      where: { id: target.eventId, organizationId: target.organizationId },
      select: RSVP_RULES_SELECT,
    });
    if (!event) return false;
    return setRegistrationStatus(db, event, registrationId, "CANCELLED");
  });
  store.delete({ name: rsvpCookieName(target.eventId), path: rsvpCookiePath(parsed.data.slug) });
  return done ? { ok: true } : { ok: false, error: "We couldn't find your sign-up." };
}
