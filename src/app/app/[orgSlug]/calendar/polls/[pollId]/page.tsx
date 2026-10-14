import { BackLink } from "@/components/back-link";
import { notFound, redirect } from "next/navigation";

import { QuestionPoll } from "@/components/calendar/question-poll-view";
import { can } from "@/lib/auth/permissions";
import { safeTimeZone } from "@/lib/calendar/dates";
import { buildQuestionPollView } from "@/lib/polls/question-poll";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { loadQuestionPollSource } from "@/server/polls/question-polls";

/**
 * One question poll. An availability (find-a-time) poll's id goes to its
 * page under Find a time, so links from before that section existed (in
 * emails, pins, bookmarks) keep working; nothing else is a poll.
 */
export default async function PollDetailPage({
  params,
}: PageProps<"/app/[orgSlug]/calendar/polls/[pollId]">) {
  const { orgSlug, pollId } = await params;
  const { organization: org, user, role } = await getOrgContextBySlug(orgSlug);
  const loaded = await withOrgTx(org.id, async ({ db }) => {
    const question = await loadQuestionPollSource(db, org.id, pollId, user.id);
    if (!question) {
      const availability = await db.availabilityPoll.findFirst({
        where: { id: pollId, organizationId: org.id },
        select: { id: true },
      });
      return availability ? { kind: "availability" as const } : null;
    }
    const me = await db.user.findUnique({
      where: { id: user.id },
      select: { name: true, image: true, avatar: true },
    });
    return { kind: "question" as const, question, me };
  });
  if (!loaded) notFound();
  if (loaded.kind === "availability") {
    redirect(`/app/${orgSlug}/calendar/find-a-time/${encodeURIComponent(pollId)}`);
  }

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
      <BackLink href={`/app/${orgSlug}/calendar/polls`} label="Polls" />
      <QuestionPoll
        poll={view}
        orgId={org.id}
        orgSlug={orgSlug}
        timeZone={safeTimeZone(org.timezone)}
      />
    </div>
  );
}
