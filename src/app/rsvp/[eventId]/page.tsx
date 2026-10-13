import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { RsvpManager } from "@/components/rsvp/rsvp-manager";
import { requireUser } from "@/lib/auth/session";
import { withOrgTx } from "@/server/db/context";
import { purgeDate } from "@/server/rsvp/free-events";
import { loadRsvpManager } from "@/server/rsvp/manage";
import { getPersonalSpace } from "@/server/rsvp/personal";
import { smsDelivery } from "@/server/sms";

export const metadata: Metadata = { title: "Your event · Bananasplit" };

/**
 * A free event's host screen: the same guest list and page settings a club
 * gets, plus how long the guest list is kept and "Save to a club".
 */
export default async function FreeEventPage({
  params,
  searchParams,
}: PageProps<"/rsvp/[eventId]">) {
  const { eventId } = await params;
  const user = await requireUser();
  const space = await getPersonalSpace(user.id);
  if (!space) redirect("/rsvp");

  const data = await withOrgTx(space.id, ({ db }) =>
    loadRsvpManager(db, space.id, eventId, space.timezone),
  );
  if (!data) notFound();
  const { event } = data;
  const created = (await searchParams).new === "1";
  const ended = event.endsAt <= new Date();

  return (
    <main className="w-full px-5 py-8">
      <RsvpManager
        {...data.props}
        links={{
          back: { href: "/rsvp", label: "Your events" },
          edit: `/rsvp/${event.id}/edit`,
          door: `/rsvp/${event.id}/door`,
          flyer: `/e/${event.rsvpSlug}/flyer`,
        }}
        messaging={{ email: "platform", texts: smsDelivery() === "live" }}
        personal={{
          purgeOn: ended
            ? purgeDate(event.endsAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
              })
            : null,
          purged: event.rsvpGuestsPurgedAt !== null,
          saveHref: `/rsvp/${event.id}/save`,
        }}
        initialTab={created ? "page" : "guests"}
      />
    </main>
  );
}
