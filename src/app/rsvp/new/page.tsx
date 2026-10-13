import type { Metadata } from "next";
import Link from "next/link";

import { VerifyEmailNotice } from "@/components/auth/verify-email-notice";
import { FreeEventForm } from "@/components/rsvp/free-event-form";
import { getUserIdentity } from "@/lib/auth/email-verification";
import { requireUser } from "@/lib/auth/session";
import {
  zonedDateTimeLocal,
  zonedTimeToInstant,
  addDaysToKey,
  zonedDateKey,
} from "@/lib/calendar/dates";
import { getPersonalSpace } from "@/server/rsvp/personal";

import { createFreeEvent } from "../actions";

export const metadata: Metadata = { title: "New event · Bananasplit" };

/**
 * /rsvp/new: a free event page in one form. Signed out, requireUser sends
 * the visitor to sign in (or create an account) and back here. The page is
 * live as soon as it's made; the cost, bring list and cover come next.
 */
export default async function NewFreeEventPage() {
  const user = await requireUser();
  const identity = await getUserIdentity(user.id);
  const verified = Boolean(identity?.emailVerified);
  // Tomorrow, 7 to 9 PM, in the space's zone (or Eastern before there is one);
  // the form sends the browser's zone with the times.
  const timeZone = (await getPersonalSpace(user.id))?.timezone ?? "America/New_York";
  const tomorrow = addDaysToKey(zonedDateKey(new Date(), timeZone), 1);
  const start = zonedTimeToInstant(tomorrow, timeZone, 19, 0);
  const end = zonedTimeToInstant(tomorrow, timeZone, 21, 0);

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-5 py-10">
      <div className="flex flex-col gap-2">
        <Link href="/rsvp" className="text-ink-muted w-fit text-[14px] font-semibold">
          ← Events
        </Link>
        <h1 className="font-heading m-0 text-[clamp(32px,5vw,44px)] leading-[1.04] tracking-[-0.025em]">
          New event
        </h1>
        <p className="text-ink-muted m-0 text-[16px] leading-[1.55]">
          Free, with no club needed. Next you can split the cost, add a bring list and a cover.
        </p>
      </div>
      <section className="border-ink/8 bg-paper shadow-card rounded-[24px] border p-5 sm:p-7">
        {verified ? (
          <FreeEventForm
            action={createFreeEvent}
            creating
            initial={{
              title: "",
              startsAt: zonedDateTimeLocal(start, timeZone),
              endsAt: zonedDateTimeLocal(end, timeZone),
              location: "",
              conferenceUrl: "",
              description: "",
            }}
            submitLabel="Create the page"
            pendingLabel="Creating your page…"
          />
        ) : (
          <VerifyEmailNotice email={identity?.email ?? user.email} action="create an event page" />
        )}
      </section>
    </main>
  );
}
