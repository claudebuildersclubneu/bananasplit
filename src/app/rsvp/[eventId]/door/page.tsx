import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { DoorMode } from "@/components/rsvp/door-mode";
import { requireUser } from "@/lib/auth/session";
import { withOrgTx } from "@/server/db/context";
import { loadDoorList } from "@/server/rsvp/manage";
import { getPersonalSpace } from "@/server/rsvp/personal";

export const metadata: Metadata = { title: "Door mode · Bananasplit" };

/** Door mode for a free event. */
export default async function FreeDoorPage({ params }: PageProps<"/rsvp/[eventId]/door">) {
  const { eventId } = await params;
  const user = await requireUser();
  const space = await getPersonalSpace(user.id);
  if (!space) redirect("/rsvp");
  const data = await withOrgTx(space.id, ({ db }) =>
    loadDoorList(db, space.id, eventId, space.timezone),
  );
  if (!data) notFound();
  return (
    <main className="w-full px-4 py-6">
      <DoorMode
        orgId={space.id}
        eventId={eventId}
        title={data.title}
        when={data.when}
        guests={data.guests}
        backHref={`/rsvp/${eventId}`}
      />
    </main>
  );
}
