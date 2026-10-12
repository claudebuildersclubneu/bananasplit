import { BackLink } from "@/components/back-link";
import { notFound } from "next/navigation";

import { PollResponder } from "@/components/calendar/poll-responder";
import { QuestionPoll } from "@/components/calendar/question-poll-view";
import { can } from "@/lib/auth/permissions";
import { safeTimeZone } from "@/lib/calendar/dates";
import { buildPollView } from "@/lib/polls/poll-view";
import { buildQuestionPollView } from "@/lib/polls/question-poll";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { loadQuestionPollSource } from "@/server/polls/question-polls";

import { getPollMemberNames, getPollSource } from "../../queries";
import { AvailabilityPollActions } from "./poll-actions";

/**
 * One poll, of either kind: an availability poll (find a time) when the id
 * is one, else a question poll; nothing else is a poll.
 */
export default async function PollDetailPage({
  params,
}: PageProps<"/app/[orgSlug]/calendar/polls/[pollId]">) {
  const { orgSlug, pollId } = await params;
  const { organization: org, user, role } = await getOrgContextBySlug(orgSlug);
  const loaded = await withOrgTx(org.id, async ({ db }) => {
    const poll = await getPollSource(db, org.id, pollId);
    if (!poll) {
      const question = await loadQuestionPollSource(db, org.id, pollId, user.id);
      if (!question) return null;
      const me = await db.user.findUnique({
        where: { id: user.id },
        select: { name: true, image: true, avatar: true },
      });
      return { kind: "question" as const, question, me };
    }
    return {
      kind: "availability" as const,
      poll,
      memberNames: await getPollMemberNames(db, org.id, poll),
    };
  });
  if (!loaded) notFound();

  const backLink = <BackLink href={`/app/${orgSlug}/calendar/polls`} label="Polls" />;

  if (loaded.kind === "question") {
    const view = buildQuestionPollView(
      loaded.question,
      {
        userId: user.id,
        isAdmin: can({ role }, "events.write"),
        profile: loaded.me ?? { name: user.name ?? null, image: null, avatar: null },
      },
      new Date(),
    );
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {backLink}
        <QuestionPoll
          poll={view}
          orgId={org.id}
          orgSlug={orgSlug}
          timeZone={safeTimeZone(org.timezone)}
        />
      </div>
    );
  }

  const { poll, memberNames } = loaded;
  // Finalizing creates an event, which is ADMIN+ (the event service).
  const canFinalize = can({ role }, "events.write");
  const canDelete = poll.createdById === user.id || canFinalize;
  const isOpen = !poll.finalizedEventId && !(poll.closesAt && poll.closesAt < new Date());

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {backLink}
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
