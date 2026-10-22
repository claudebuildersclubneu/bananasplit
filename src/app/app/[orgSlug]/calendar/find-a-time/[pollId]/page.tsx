import { redirect } from "next/navigation";

import { BackLink } from "@/components/back-link";
import { PollResponder } from "@/components/calendar/poll-responder";
import { can } from "@/lib/auth/permissions";
import { buildPollView } from "@/lib/polls/poll-view";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { planGate } from "@/server/billing/plan-gate";

import { getPollMemberNames, getPollSource } from "../../queries";
import { AvailabilityPollActions } from "./poll-actions";

/**
 * One find-a-time (availability) poll: mark when you're free, see everyone's
 * answers, and (owners and admins) schedule it. Any other id is handed to
 * Polls, which shows a question poll or a 404.
 */
export default async function FindATimePollPage({
  params,
}: PageProps<"/app/[orgSlug]/calendar/find-a-time/[pollId]">) {
  const { orgSlug, pollId } = await params;
  const planLock = await planGate(orgSlug, "polls");
  if (planLock) return planLock;
  const { organization: org, user, role } = await getOrgContextBySlug(orgSlug);
  const loaded = await withOrgTx(org.id, async ({ db }) => {
    const poll = await getPollSource(db, org.id, pollId);
    if (!poll) return null;
    return { poll, memberNames: await getPollMemberNames(db, org.id, poll) };
  });
  if (!loaded) redirect(`/app/${orgSlug}/calendar/polls/${pollId}`);

  const { poll, memberNames } = loaded;
  // Finalizing creates an event, which is ADMIN+ (the event service).
  const canFinalize = can({ role }, "events.write");
  const canDelete = poll.createdById === user.id || canFinalize;
  const isOpen = !poll.finalizedEventId && !(poll.closesAt && poll.closesAt < new Date());

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* On a phone the poll's actions are one menu, on this row (the title gets the width). */}
      <div className="flex items-center justify-between gap-2">
        <BackLink href={`/app/${orgSlug}/calendar/find-a-time`} label="Find a time" />
        <div className="md:hidden">
          <AvailabilityPollActions
            orgId={org.id}
            orgSlug={orgSlug}
            pollId={poll.id}
            title={poll.title}
            isOpen={isOpen}
            canDelete={canDelete}
            scheduled={Boolean(poll.finalizedEventId)}
            compact
          />
        </div>
      </div>
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
