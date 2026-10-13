import { appUrl } from "@/lib/app-url";
import { avatarSource } from "@/lib/avatar";
import { safeTimeZone } from "@/lib/calendar/dates";
import { orgLogoUrl } from "@/lib/org-logo";
import { parseStoredLinks } from "@/lib/profile/links";
import { resolveRsvpBackground, type RsvpBackground } from "@/lib/rsvp/backgrounds";
import { rsvpCover, type RsvpCover } from "@/lib/rsvp/cover";
import {
  costLine,
  hasPayTo,
  payLinks,
  shareCents,
  type CostMode,
  type PayLink,
} from "@/lib/rsvp/pay";
import { parsePayTo } from "@/lib/rsvp/pay-schema";
import {
  avatarTone,
  initials,
  maskEmail,
  placeRegistration,
  displayName,
  instagramUrl,
  spotsLeft,
  type ClosedReason,
} from "@/lib/rsvp/format";
import { withSystemOrgTx } from "@/server/db/context";

import { registrationCounts } from "./service";

/**
 * What the public RSVP page (/e/[slug]) may show, built on the service path
 * for the page's own event. Only this DTO reaches the browser: never another
 * guest's email or phone. Names show in full unless the host hides who's
 * going; the address, directions and online link only for someone signed up
 * when the host hides them.
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
  /** In full, as they typed it. */
  name: string;
  initials: string;
  tone: string;
  /** Their Instagram profile, when they chose to share it. */
  instagramUrl: string | null;
}

export interface RsvpViewer {
  status: "GOING" | "WAITLIST";
  firstName: string;
  email: string;
  /** 1-based place in line, on the waitlist. */
  waitlistPosition: number | null;
  /** Their own link to share: /e/{slug}?via={code}. */
  inviteUrl: string;
  /** People who signed up with it (and are still signed up). */
  invitedCount: number;
  /** Their ticket page (the QR a host scans at the door). */
  ticketUrl: string;
  checkedIn: boolean;
  /** Split the cost: what they owe now, how to pay, and what they said. */
  owes: number | null;
  payLinks: PayLink[];
  paid: { cents: number | null; confirmed: boolean } | null;
}

export interface RsvpPageItem {
  id: string;
  label: string;
  slots: number;
  taken: number;
  /** Who's bringing it ("Maya Patel"); empty when the host hides who's going. */
  names: string[];
  /** This browser's guest is bringing it. */
  mine: boolean;
}

export interface RsvpPageCost {
  mode: Exclude<CostMode, "NONE">;
  /** EACH: the price; SPLIT: the total. */
  cents: number;
  note: string | null;
  /** One guest's share now. */
  share: number;
  /** A new guest's share if they sign up now (a split shrinks as people join). */
  shareIfJoining: number;
  line: string;
  /** Where to pay, as the apps' names ("Venmo, Cash App"). */
  payWith: string[];
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
  /** A free page: hosted by a person, not a club. */
  personal: boolean;
  /** Free pages: who made it. */
  hostPerson: { name: string; avatarUrl: string | null; instagramUrl: string | null } | null;
  cost: RsvpPageCost | null;
  items: RsvpPageItem[];
  /** "Maya Patel" when the visitor came through a guest's invite link. */
  invitedBy: string | null;
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
  options: { via?: string | null; now?: Date } = {},
): Promise<RsvpPageData | null> {
  const now = options.now ?? new Date();
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
        rsvpCostMode: true,
        rsvpCostCents: true,
        rsvpCostNote: true,
        rsvpPayTo: true,
        createdBy: { select: { name: true, email: true, avatar: true, image: true, links: true } },
        organization: { select: { name: true, logo: true, timezone: true, kind: true } },
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
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            queuedAt: true,
            inviteCode: true,
            ticketCode: true,
            checkedInAt: true,
            paidCents: true,
            paidClaimedAt: true,
            paidConfirmedAt: true,
            _count: { select: { invited: { where: { status: { in: ["GOING", "WAITLIST"] } } } } },
          },
        })
      : null;

    // The bring list, with who's bringing what (short names, and only when
    // the host shows who's going).
    const showNames = !e.rsvpHideGuests && !e.rsvpHideCount;
    const items = (
      await db.rsvpItem.findMany({
        where: { organizationId: target.organizationId, eventId: e.id },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          label: true,
          slots: true,
          claims: {
            orderBy: { createdAt: "asc" },
            select: { registrationId: true, registration: { select: { name: true } } },
          },
        },
      })
    ).map((item): RsvpPageItem => ({
      id: item.id,
      label: item.label,
      slots: item.slots,
      taken: item.claims.length,
      names: showNames ? item.claims.map((c) => displayName(c.registration.name)) : [],
      mine: Boolean(viewerRow && item.claims.some((c) => c.registrationId === viewerRow.id)),
    }));

    // Someone's invite link: their short name, unless it's the visitor's own.
    const inviter =
      options.via && /^[a-z0-9]{6,12}$/.test(options.via)
        ? await db.eventRegistration.findFirst({
            where: {
              organizationId: target.organizationId,
              eventId: e.id,
              inviteCode: options.via,
              status: { in: ["GOING", "WAITLIST"] },
            },
            select: { id: true, name: true },
          })
        : null;
    const payTo = parsePayTo(e.rsvpPayTo);
    const costMode = e.rsvpCostMode;
    const cost: RsvpPageCost | null =
      costMode !== "NONE" && e.rsvpCostCents !== null
        ? {
            mode: costMode,
            cents: e.rsvpCostCents,
            note: e.rsvpCostNote,
            share: shareCents(costMode, e.rsvpCostCents, counts.going) ?? e.rsvpCostCents,
            shareIfJoining:
              shareCents(costMode, e.rsvpCostCents, counts.going, { includingNew: true }) ??
              e.rsvpCostCents,
            line: costLine(costMode, e.rsvpCostCents, counts.going),
            payWith: payLinks(payTo, 100, "").map((l) => l.label),
          }
        : null;
    const owes = cost && viewerRow?.status === "GOING" ? cost.share : null;

    const viewer: RsvpViewer | null = viewerRow
      ? {
          status: viewerRow.status as "GOING" | "WAITLIST",
          firstName: viewerRow.name.trim().split(/\s+/)[0] ?? viewerRow.name,
          email: maskEmail(viewerRow.email),
          inviteUrl: appUrl(`/e/${slug}?via=${viewerRow.inviteCode}`),
          invitedCount: viewerRow._count.invited,
          ticketUrl: appUrl(`/e/${slug}/t/${viewerRow.ticketCode}`),
          checkedIn: viewerRow.checkedInAt !== null,
          owes,
          payLinks:
            owes !== null && hasPayTo(payTo)
              ? payLinks(payTo, owes, `${e.title} (${viewerRow.name})`)
              : [],
          paid:
            viewerRow.paidClaimedAt || viewerRow.paidConfirmedAt
              ? { cents: viewerRow.paidCents, confirmed: viewerRow.paidConfirmedAt !== null }
              : null,
          // Their place in line, in the order the waitlist moves up.
          waitlistPosition:
            viewerRow.status === "WAITLIST"
              ? (await db.eventRegistration.count({
                  where: {
                    organizationId: target.organizationId,
                    eventId: e.id,
                    status: "WAITLIST",
                    OR: [
                      { queuedAt: { lt: viewerRow.queuedAt } },
                      { queuedAt: viewerRow.queuedAt, id: { lt: viewerRow.id } },
                    ],
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
              select: { name: true, instagram: true },
            })
          ).map((g) => ({
            name: displayName(g.name),
            initials: initials(g.name),
            tone: avatarTone(g.name),
            instagramUrl: g.instagram ? instagramUrl(g.instagram) : null,
          }));

    const ended = e.endsAt <= now;
    const personal = e.organization.kind === "PERSONAL";
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
      personal,
      hostPerson: personal
        ? {
            name: e.createdBy.name?.trim() || e.organization.name,
            avatarUrl: avatarSource(e.createdBy, 36)?.src ?? null,
            // The Instagram link on their Bananasplit profile, if they added one.
            instagramUrl:
              parseStoredLinks(e.createdBy.links).find((l) => l.kind === "instagram")?.url ?? null,
          }
        : null,
      cost,
      items,
      invitedBy: inviter && inviter.id !== viewerRow?.id ? displayName(inviter.name) : null,
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
