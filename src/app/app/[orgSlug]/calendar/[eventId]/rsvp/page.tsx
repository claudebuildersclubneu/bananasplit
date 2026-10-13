import { notFound, redirect } from "next/navigation";

import { RsvpManager } from "@/components/rsvp/rsvp-manager";
import { can } from "@/lib/auth/permissions";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { resolveOrgMailRouting } from "@/server/email/mailer";
import { loadRsvpManager } from "@/server/rsvp/manage";
import { smsDelivery } from "@/server/sms";

/**
 * An event's public RSVP page, run from the suite: the guest list (check-in,
 * payments, moving people, adding them, CSV) and the page's settings. Owners
 * and admins only; RLS also limits the sign-ups (emails, phones) to them.
 */
export default async function EventRsvpPage({
  params,
}: PageProps<"/app/[orgSlug]/calendar/[eventId]/rsvp">) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContextBySlug(orgSlug);
  // Members see the event itself (and its public link there).
  if (!can(ctx, "events.write")) redirect(`/app/${orgSlug}/calendar/${eventId}`);
  const { organization: org } = ctx;

  const data = await withOrgTx(org.id, ({ db }) =>
    loadRsvpManager(db, org.id, eventId, org.timezone),
  );
  if (!data) notFound();
  const mail = await resolveOrgMailRouting(org.id);
  const base = `/app/${orgSlug}/calendar/${eventId}`;

  return (
    <RsvpManager
      {...data.props}
      links={{
        back: { href: base, label: data.event.title },
        edit: `${base}?edit=1`,
        door: `${base}/rsvp/door`,
        flyer: `/e/${data.event.rsvpSlug}/flyer`,
      }}
      messaging={{
        email: mail.mode === "org" ? "org" : "platform",
        texts: smsDelivery() === "live",
      }}
    />
  );
}
