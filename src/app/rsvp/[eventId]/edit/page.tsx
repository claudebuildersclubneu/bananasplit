import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DeleteFreeEvent } from "@/components/rsvp/delete-free-event";
import { FreeEventForm } from "@/components/rsvp/free-event-form";
import { requireUser } from "@/lib/auth/session";
import { zonedDateTimeLocal } from "@/lib/calendar/dates";
import { findFreeEvent } from "@/server/rsvp/free-events";
import { getPersonalSpace } from "@/server/rsvp/personal";

import { updateFreeEvent } from "../../actions";

export const metadata: Metadata = { title: "Edit event · Bananasplit" };

/** A free event's details, and deleting it. */
export default async function EditFreeEventPage({ params }: PageProps<"/rsvp/[eventId]/edit">) {
  const { eventId } = await params;
  const user = await requireUser();
  const space = await getPersonalSpace(user.id);
  if (!space) redirect("/rsvp");
  const event = await findFreeEvent(space, eventId);
  if (!event) notFound();

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-5 py-10">
      <div className="flex flex-col gap-2">
        <Link href={`/rsvp/${event.id}`} className="text-ink-muted w-fit text-[14px] font-semibold">
          ← {event.title}
        </Link>
        <h1 className="font-heading m-0 text-[clamp(30px,5vw,40px)] leading-[1.05] tracking-[-0.025em]">
          Edit event
        </h1>
        <p className="text-ink-muted m-0 text-[15px]">
          Times are in {space.timezone.replace(/_/g, " ")}. Move it and the reminders follow the new
          time.
        </p>
      </div>
      <section className="border-ink/8 bg-paper shadow-card rounded-[24px] border p-5 sm:p-7">
        <FreeEventForm
          action={updateFreeEvent.bind(null, event.id)}
          initial={{
            title: event.title,
            startsAt: zonedDateTimeLocal(event.startsAt, space.timezone),
            endsAt: zonedDateTimeLocal(event.endsAt, space.timezone),
            location: event.location ?? "",
            conferenceUrl: event.conferenceUrl ?? "",
            description: event.description ?? "",
          }}
          submitLabel="Save changes"
          pendingLabel="Saving…"
        />
      </section>
      <DeleteFreeEvent eventId={event.id} title={event.title} />
    </main>
  );
}
