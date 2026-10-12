import { NextResponse } from "next/server";

import { rsvpPageTarget } from "@/server/rsvp/page";
import {
  readRsvpManageKey,
  RSVP_COOKIE_MAX_AGE_SECONDS,
  rsvpCookieName,
  rsvpCookiePath,
} from "@/server/rsvp/token";

/**
 * GET /e/{slug}/manage?key=...: the link in a guest's RSVP emails. A
 * well-signed key becomes this browser's cookie for the page (so it shows
 * "You're going" and Can't go), then the page itself. A bad key just opens
 * the page.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(request.url);
  const page = new URL(`/e/${slug}`, url);
  const target = await rsvpPageTarget(slug);
  const key = url.searchParams.get("key");
  const response = NextResponse.redirect(page, { status: 303 });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  if (target && key && readRsvpManageKey(key)) {
    response.cookies.set(rsvpCookieName(target.eventId), key, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: rsvpCookiePath(slug),
      maxAge: RSVP_COOKIE_MAX_AGE_SECONDS,
    });
  }
  return response;
}
