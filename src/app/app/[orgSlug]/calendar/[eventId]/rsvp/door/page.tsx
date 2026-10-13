import { notFound, redirect } from "next/navigation";

import { DoorMode } from "@/components/rsvp/door-mode";
import { can } from "@/lib/auth/permissions";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { loadDoorList } from "@/server/rsvp/manage";

export const metadata = { title: "Door mode · Bananasplit" };

/** Door mode for a club's event: check guests in by name or by scanning tickets. */
export default async function DoorPage({
  params,
}: PageProps<"/app/[orgSlug]/calendar/[eventId]/rsvp/door">) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContextBySlug(orgSlug);
  if (!can(ctx, "events.write")) redirect(`/app/${orgSlug}/calendar/${eventId}`);
  const org = ctx.organization;
  const data = await withOrgTx(org.id, ({ db }) => loadDoorList(db, org.id, eventId, org.timezone));
  if (!data) notFound();
  return (
    <DoorMode
      orgId={org.id}
      eventId={eventId}
      title={data.title}
      when={data.when}
      guests={data.guests}
      backHref={`/app/${orgSlug}/calendar/${eventId}/rsvp`}
    />
  );
}
