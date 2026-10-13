import { OrgKind } from "@/generated/prisma/client";
import { withOrgTx } from "@/server/db/context";

import { PERSONAL_GUEST_DAYS, type PersonalSpace } from "./personal";

/**
 * Reads for the free RSVP space (/rsvp): the person's events with their
 * numbers, and one event checked to be theirs. Run as the person (app_user)
 * in their own space.
 */

export interface FreeEventSummary {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  slug: string | null;
  enabled: boolean;
  going: number;
  waitlist: number;
  coverUrl: string | null;
  /** When the guest list goes (30 days after it ends), or when it went. */
  purgeOn: Date;
  purged: boolean;
}

const DAY = 24 * 60 * 60 * 1000;

export function purgeDate(endsAt: Date): Date {
  return new Date(endsAt.getTime() + PERSONAL_GUEST_DAYS * DAY);
}

export async function listFreeEvents(space: PersonalSpace): Promise<FreeEventSummary[]> {
  return withOrgTx(space.id, async ({ db }) => {
    const events = await db.event.findMany({
      where: {
        organizationId: space.id,
        deletedAt: null,
        organization: { kind: OrgKind.PERSONAL },
      },
      orderBy: { startsAt: "desc" },
      take: 200,
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
        allDay: true,
        rsvpSlug: true,
        rsvpEnabled: true,
        rsvpCover: true,
        rsvpGuestsPurgedAt: true,
      },
    });
    const counts = await db.eventRegistration.groupBy({
      by: ["eventId", "status"],
      where: { organizationId: space.id, status: { in: ["GOING", "WAITLIST"] } },
      _count: { _all: true },
    });
    const count = (eventId: string, status: string) =>
      counts.find((c) => c.eventId === eventId && c.status === status)?._count._all ?? 0;
    return events.map((e) => {
      const cover = e.rsvpCover as { s480?: unknown } | null;
      return {
        id: e.id,
        title: e.title,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        allDay: e.allDay,
        slug: e.rsvpSlug,
        enabled: e.rsvpEnabled,
        going: count(e.id, "GOING"),
        waitlist: count(e.id, "WAITLIST"),
        coverUrl: typeof cover?.s480 === "string" ? cover.s480 : null,
        purgeOn: e.rsvpGuestsPurgedAt ?? purgeDate(e.endsAt),
        purged: e.rsvpGuestsPurgedAt !== null,
      };
    });
  });
}

/** The event if it is in this person's space and not deleted, else null. */
export async function findFreeEvent(
  space: PersonalSpace,
  eventId: string,
): Promise<{
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  conferenceUrl: string | null;
  startsAt: Date;
  endsAt: Date;
  rsvpSlug: string | null;
  rsvpGuestsPurgedAt: Date | null;
} | null> {
  return withOrgTx(space.id, ({ db }) =>
    db.event.findFirst({
      where: { id: eventId, organizationId: space.id, deletedAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        conferenceUrl: true,
        startsAt: true,
        endsAt: true,
        rsvpSlug: true,
        rsvpGuestsPurgedAt: true,
      },
    }),
  );
}
