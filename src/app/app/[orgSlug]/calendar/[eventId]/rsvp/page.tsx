import { notFound, redirect } from "next/navigation";

import { RsvpManager } from "@/components/rsvp/rsvp-manager";
import { appUrl } from "@/lib/app-url";
import { can } from "@/lib/auth/permissions";
import { safeTimeZone } from "@/lib/calendar/dates";
import { rsvpCover } from "@/lib/rsvp/cover";
import { whenLine } from "@/lib/rsvp/when";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { resolveOrgMailRouting } from "@/server/email/mailer";
import { smsDelivery } from "@/server/sms";

/**
 * An event's public RSVP page, run from the suite: the guest list (check-in,
 * moving people, adding them, CSV) and the page's settings. Owners and
 * admins only; RLS also limits the sign-ups (emails, phones) to them.
 */
export default async function EventRsvpPage({
  params,
}: PageProps<"/app/[orgSlug]/calendar/[eventId]/rsvp">) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContextBySlug(orgSlug);
  // Members see the event itself (and its public link there).
  if (!can(ctx, "events.write")) redirect(`/app/${orgSlug}/calendar/${eventId}`);
  const { organization: org } = ctx;

  const data = await withOrgTx(org.id, async ({ db }) => {
    const event = await db.event.findFirst({
      where: { id: eventId, organizationId: org.id, deletedAt: null },
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
        allDay: true,
        location: true,
        rsvpEnabled: true,
        rsvpSlug: true,
        locationDetails: true,
        rsvpCapacity: true,
        rsvpWaitlist: true,
        rsvpClosed: true,
        rsvpHideLocation: true,
        rsvpHideGuests: true,
        rsvpHideCount: true,
        rsvpBackground: true,
        rsvpCover: true,
      },
    });
    if (!event) return null;
    const guests = await db.eventRegistration.findMany({
      where: { organizationId: org.id, eventId: event.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        checkedInAt: true,
        createdAt: true,
      },
    });
    return { event, guests };
  });
  if (!data) notFound();
  const { event, guests } = data;
  const mail = await resolveOrgMailRouting(org.id);
  const timeZone = safeTimeZone(org.timezone);

  return (
    <RsvpManager
      orgId={org.id}
      orgSlug={orgSlug}
      event={{
        id: event.id,
        title: event.title,
        when: whenLine(event.startsAt, event.endsAt, timeZone, event.allDay),
        location: event.location,
        ended: event.endsAt <= new Date(),
      }}
      page={{
        enabled: event.rsvpEnabled,
        url: event.rsvpSlug ? appUrl(`/e/${event.rsvpSlug}`) : null,
        cover: rsvpCover(event.rsvpCover),
        settings: {
          locationDetails: event.locationDetails ?? "",
          capacity: event.rsvpCapacity,
          waitlist: event.rsvpWaitlist,
          closed: event.rsvpClosed,
          hideLocation: event.rsvpHideLocation,
          hideGuests: event.rsvpHideGuests,
          hideCount: event.rsvpHideCount,
          background: event.rsvpBackground,
        },
      }}
      guests={guests.map((g) => ({
        id: g.id,
        name: g.name,
        email: g.email,
        phone: g.phone,
        status: g.status,
        checkedIn: g.checkedInAt !== null,
        createdAt: g.createdAt.toISOString(),
      }))}
      messaging={{
        email: mail.mode === "org" ? "org" : "platform",
        texts: smsDelivery() === "live",
      }}
    />
  );
}
