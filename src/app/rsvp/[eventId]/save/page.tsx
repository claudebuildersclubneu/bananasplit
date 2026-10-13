import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SaveToClub } from "@/components/rsvp/save-to-club";
import { requireUser } from "@/lib/auth/session";
import { findFreeEvent } from "@/server/rsvp/free-events";
import { clubsUserRuns, getPersonalSpace, PERSONAL_GUEST_DAYS } from "@/server/rsvp/personal";

export const metadata: Metadata = { title: "Save to a club · Bananasplit" };

const KEEPS = [
  "The same link, so nothing you shared breaks",
  "Every guest, their check-ins, payments and bring list",
  "The guest list for good, instead of " + PERSONAL_GUEST_DAYS + " days",
  "Check-ins from now on land in the club's People and Attendance databases",
  "Your officers can run it with you",
];

/**
 * "Save to a club": move a free event into a club the person owns or
 * runs, or start a club and move it in once it exists.
 */
export default async function SaveToClubPage({ params }: PageProps<"/rsvp/[eventId]/save">) {
  const { eventId } = await params;
  const user = await requireUser();
  const space = await getPersonalSpace(user.id);
  if (!space) redirect("/rsvp");
  const event = await findFreeEvent(space, eventId);
  if (!event) notFound();
  const clubs = await clubsUserRuns(user.id);

  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-col gap-6 px-5 py-10">
      <div className="flex flex-col gap-2">
        <Link href={`/rsvp/${event.id}`} className="text-ink-muted w-fit text-[14px] font-semibold">
          ← {event.title}
        </Link>
        <h1 className="font-heading m-0 text-[clamp(30px,5vw,42px)] leading-[1.05] tracking-[-0.025em]">
          Save {event.title} to a club
        </h1>
        <p className="text-ink-muted m-0 text-[16px] leading-[1.55]">
          A club on Bananasplit keeps what a free page lets go. Moving it in brings:
        </p>
      </div>

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {KEEPS.map((line) => (
          <li key={line} className="flex gap-2.5 text-[15px] leading-[1.45]">
            <Check
              className="text-honey mt-0.5 size-4 flex-none"
              strokeWidth={2.6}
              aria-hidden="true"
            />
            {line}
          </li>
        ))}
      </ul>

      <SaveToClub eventId={event.id} clubs={clubs.map((c) => ({ id: c.id, name: c.name }))} />
    </main>
  );
}
