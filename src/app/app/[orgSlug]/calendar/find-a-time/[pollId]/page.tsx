import { BackLink } from "@/components/back-link";
import { notFound } from "next/navigation";

import { PollResponder } from "@/components/calendar/poll-responder";
import { can } from "@/lib/auth/permissions";
import { buildPollView } from "@/lib/polls/poll-view";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";

import { getPollMemberNames, getPollSource } from "../../queries";
import { AvailabilityPollActions } from "./poll-actions";

/** One find-a-time (availability) poll: mark when you're free, see when everyone is. */
export default async function FindATimePollPage({
  params,
}: PageProps<"/app/[orgSlug]/calendar/find-a-time/[pollId]">) {
  const { orgSlug, pollId } = await params;
  const { organization: org, user, role } = await getOrgContextBySlug(orgSlug);
  const loaded = await withOrgTx(org.id, async ({ db }) => {
    const poll = await getPollSource(db, org.id, pollId);
    if (!poll) return null;
    return { poll, memberNames: await getPollMemberNames(db, org.id, poll) };
  });
  if (!loaded) notFound();

  const { poll, memberNames } = loaded;
  // Finalizing creates an event, which is ADMIN+ (the event service).
  const canFinalize = can({ role }, "events.write");
  const canDelete = poll.createdById === user.id || canFinalize;
  const isOpen = !poll.finalizedEventId && !(poll.closesAt && poll.closesAt < new Date());

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <BackLink href={`/app/${orgSlug}/calendar/find-a-time`} label="Find a time" />
      <PollResponder
        poll={buildPollView(poll, { kind: "member", userId: user.id }, { memberNames })}
        respondAs="member"
        orgId={org.id}
        orgSlug={orgSlug}
        canFinalize={canFinalize}
        actions={
          <AvailabilityPollActions
            orgId={org.id}
            orgSlug={orgSlug}
            pollId={poll.id}
            title={poll.title}
            isOpen={isOpen}
            canDelete={canDelete}
            scheduled={Boolean(poll.finalizedEventId)}
          />
        }
      />
    </div>
  );
}
