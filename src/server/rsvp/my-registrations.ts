import type { OrgKind, RegistrationStatus } from "@/generated/prisma/client";
import { withUserTx } from "@/server/db/context";

/** One of your own sign-ups on a public RSVP page, in any space. */
export interface RegistrationRow {
  registrationId: string;
  status: RegistrationStatus;
  ticketCode: string;
  eventId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  rsvpSlug: string;
  spaceKind: OrgKind;
  spaceName: string;
  spaceTimezone: string;
}

/**
 * The signed-in user's upcoming sign-ups (going or waitlisted), soonest
 * first, on pages that are still on: app.my_rsvp_registrations, a SECURITY
 * DEFINER lookup that returns only your own rows (by user id, or your
 * verified email), whether or not you're in the host's club. At most 50.
 */
export function myRsvpRegistrations(userId: string, limit: number): Promise<RegistrationRow[]> {
  return withUserTx(
    userId,
    ({ db }) =>
      db.$queryRaw<RegistrationRow[]>`
        SELECT "registrationId", "status", "ticketCode", "eventId", "title", "startsAt",
               "endsAt", "allDay", "rsvpSlug", "spaceKind", "spaceName", "spaceTimezone"
          FROM app.my_rsvp_registrations(${limit}::integer)`,
  );
}
