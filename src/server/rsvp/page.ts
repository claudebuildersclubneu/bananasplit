import { safeTimeZone } from "@/lib/calendar/dates";
import { orgLogoUrl } from "@/lib/org-logo";
import { resolveRsvpBackground, type RsvpBackground } from "@/lib/rsvp/backgrounds";
import { rsvpCover, type RsvpCover } from "@/lib/rsvp/cover";
import {
  avatarTone,
  initials,
  maskEmail,
  placeRegistration,
  publicName,
  spotsLeft,
  type ClosedReason,
} from "@/lib/rsvp/format";
import { withSystemOrgTx } from "@/server/db/context";

import { registrationCounts } from "./service";

/**
 * What the public RSVP page (/e/[slug]) may show, built on the service path
 * for the page's own event. Only this DTO reaches the browser: never another
 * guest's email or phone, names shortened to "Maya P.", and the address,
 * directions and online link only for someone signed up when the host hides
 * them.
 */

const SLUG = /^[a-z0-9]{8}$/;

export interface RsvpTarget {
  organizationId: string;
  eventId: string;
}

/** The live page behind a code (app.rsvp_page), or null. */
export async function rsvpPageTarget(slug: string): Promise<RsvpTarget | null> {
  if (!SLUG.test(slug)) return null;
  return withSystemOrgTx(null, async ({ db }) => {
    const rows = await db.$queryRaw<{ organizationId: string; eventId: string }[]>`
      SELECT "organizationId", "eventId" FROM app.rsvp_page(${slug})`;
    return rows[0] ?? null;
  });
}

export interface RsvpGuest {
  name: string;
  initials: string;
  tone: string;
}

export interface RsvpViewer {
  status: "GOING" | "WAITLIST";
  firstName: string;
  email: string;
  /** 1-based place in line, on the waitlist. */
  waitlistPosition: number | null;
}

export interface RsvpPageData {
  slug: string;
  eventId: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  timeZone: string;
  /** Null when hidden from this visitor, or when there is none. */
  location: string | null;
  locationDetails: string | null;
  locationHidden: boolean;
  joinUrl: string | null;
  online: boolean;
  org: { name: string; logoUrl: string | null };
  host: string | null;
  cover: RsvpCover | null;
  background: RsvpBackground;
  backgroundId: string;
  /** Null when the host hides the count. */
  going: number | null;
  waitlisting: number | null;
  spotsLeft: number | null;
  capacity: number | null;
  /** Null when the host hides the list. */
  guests: RsvpGuest[] | null;
  /** Why it isn't taking sign-ups, or null when it is. */
  closed: ClosedReason | null;
  /** Sign-ups go to the waitlist now. */
  waitlistOnly: boolean;
  ended: boolean;
  viewer: RsvpViewer | null;
}

const GUESTS_SHOWN = 60;

export async function loadRsvpPage(
  slug: string,
  target: RsvpTarget,
  viewerRegistrationId: string | null,
  now: Date = new Date(),
): Promise<RsvpPageData | null> {
  return withSystemOrgTx(target.organizationId, async ({ db }) => {
    const e = await db.event.findFirst({
      where: { id: target.eventId, organizationId: target.organizationId, deletedAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        endsAt: true,
        allDay: true,
        location: true,
        locationDetails: true,
        conferenceProvider: true,
        conferenceUrl: true,
        hostName: true,
        host: { select: { name: true } },
        rsvpEnabled: true,
        rsvpCapacity: true,
        rsvpWaitlist: true,
        rsvpClosed: true,
        rsvpHideLocation: true,
        rsvpHideGuests: true,
        rsvpHideCount: true,
        rsvpBackground: true,
        rsvpCover: true,
        organization: { select: { name: true, logo: true, timezone: true } },
      },
    });
    if (!e || !e.rsvpEnabled) return null;

    const counts = await registrationCounts(db, target.organizationId, e.id);
    const viewerRow = viewerRegistrationId
      ? await db.eventRegistration.findFirst({
          where: {
            id: viewerRegistrationId,
            organizationId: target.organizationId,
            eventId: e.id,
            status: { in: ["GOING", "WAITLIST"] },
          },
          select: { id: true, name: true, email: true, status: true, createdAt: true },
        })
      : null;
    const viewer: RsvpViewer | null = viewerRow
      ? {
          status: viewerRow.status as "GOING" | "WAITLIST",
          firstName: viewerRow.name.trim().split(/\s+/)[0] ?? viewerRow.name,
          email: maskEmail(viewerRow.email),
          waitlistPosition:
            viewerRow.status === "WAITLIST"
              ? (await db.eventRegistration.count({
                  where: {
                    organizationId: target.organizationId,
                    eventId: e.id,
                    status: "WAITLIST",
                    createdAt: { lt: viewerRow.createdAt },
                  },
                })) + 1
              : null,
        }
      : null;

    // A list of names is a count too, so hiding the count hides the list.
    const guests =
      e.rsvpHideGuests || e.rsvpHideCount
        ? null
        : (
            await db.eventRegistration.findMany({
              where: { organizationId: target.organizationId, eventId: e.id, status: "GOING" },
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              take: GUESTS_SHOWN,
              select: { name: true },
            })
          ).map((g) => ({
            name: publicName(g.name),
            initials: initials(g.name),
            tone: avatarTone(g.name),
          }));

    const ended = e.endsAt <= now;
    const placed = placeRegistration(
      { capacity: e.rsvpCapacity, waitlist: e.rsvpWaitlist, closed: e.rsvpClosed },
      counts.going,
      ended,
    );
    const signedUp = viewer?.status === "GOING";
    const hideWhere = e.rsvpHideLocation && !signedUp;
    const cover = rsvpCover(e.rsvpCover);
    const online = e.conferenceProvider !== "NONE" && Boolean(e.conferenceUrl);

    return {
      slug,
      eventId: e.id,
      title: e.title,
      description: e.description,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      allDay: e.allDay,
      timeZone: safeTimeZone(e.organization.timezone),
      location: hideWhere ? null : e.location,
      locationDetails: hideWhere ? null : e.locationDetails,
      locationHidden: hideWhere && Boolean(e.location || e.locationDetails),
      // The meeting link is for people who signed up, always.
      joinUrl: signedUp && online ? e.conferenceUrl : null,
      online,
      org: { name: e.organization.name, logoUrl: orgLogoUrl(e.organization.logo, 64) },
      host: e.host?.name ?? e.hostName ?? null,
      cover,
      background: resolveRsvpBackground(e.rsvpBackground, Boolean(cover)),
      backgroundId: e.rsvpBackground,
      going: e.rsvpHideCount ? null : counts.going,
      waitlisting: e.rsvpHideCount ? null : counts.waitlist,
      spotsLeft: e.rsvpHideCount ? null : spotsLeft(e.rsvpCapacity, counts.going),
      capacity: e.rsvpHideCount ? null : e.rsvpCapacity,
      guests,
      closed: "closed" in placed ? placed.closed : null,
      waitlistOnly: "status" in placed && placed.status === "WAITLIST",
      ended,
      viewer,
    };
  });
}
