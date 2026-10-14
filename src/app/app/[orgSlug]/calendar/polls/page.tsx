import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { NewPollMenu } from "@/components/polls/new-poll-menu";
import { PollList } from "@/components/polls/poll-list";
import { can } from "@/lib/auth/permissions";
import { safeTimeZone } from "@/lib/calendar/dates";
import { isPollOpen } from "@/lib/polls/question-poll";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { listQuestionPolls } from "@/server/polls/question-polls";

import { questionItem } from "./list-items";

/**
 * Polls: questions people vote on, newest first, split into open and
 * closed. Find-a-time (availability) polls have their own page and sidebar
 * section, /calendar/find-a-time.
 */
export default async function PollsListPage({
  params,
}: PageProps<"/app/[orgSlug]/calendar/polls">) {
  const { orgSlug } = await params;

  const { organization: org, user, role } = await getOrgContextBySlug(orgSlug);
  const questions = await withOrgTx(org.id, ({ db }) => listQuestionPolls(db, org.id));
  const now = new Date();
  const isAdmin = can({ role }, "events.write");
  const base = `/app/${orgSlug}/calendar/polls`;
  const timeZone = safeTimeZone(org.timezone);

  const all = [...questions]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((p) => ({
      open: isPollOpen(p, now),
      item: questionItem(p, base, now, timeZone, p.createdById === user.id || isAdmin),
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Polls"
        description="Ask the club a question and let people vote."
        actions={<NewPollMenu orgSlug={orgSlug} />}
      />

      {all.length === 0 ? (
        // The header's New poll is always on screen, so no second set of buttons here.
        <EmptyState
          title="No polls yet"
          description="Start one with New poll: ask a question, give some options, and let people vote. To find a meeting time, use Find a time."
        />
      ) : (
        <PollList
          orgId={org.id}
          open={all.filter((p) => p.open).map((p) => p.item)}
          closed={all.filter((p) => !p.open).map((p) => p.item)}
        />
      )}
    </div>
  );
}
