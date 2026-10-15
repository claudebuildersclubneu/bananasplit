import { Plus } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PollList } from "@/components/polls/poll-list";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { planGate } from "@/server/billing/plan-gate";

import { availabilityItem, availabilityOpen } from "../polls/poll-items";
import { getOrgPolls } from "../queries";

/**
 * Find a time: the space's availability polls (When2meet-style), newest
 * first, open ones on top. It was one kind of poll under Polls; it has its
 * own section so the most common way to plan a meeting is one click away.
 * In Personal it is the only kind of poll (a question needs members to
 * vote), so older Personal question polls get a pointer to their list.
 */
export default async function FindATimePage({
  params,
}: PageProps<"/app/[orgSlug]/calendar/find-a-time">) {
  const { orgSlug } = await params;
  const planLock = await planGate(orgSlug, "polls");
  if (planLock) return planLock;

  const { organization: org, user, role } = await getOrgContextBySlug(orgSlug);
  const personal = org.kind === "PERSONAL";
  const { polls, questionCount } = await withOrgTx(org.id, async ({ db }) => ({
    polls: await getOrgPolls(db, org.id),
    questionCount: personal ? await db.poll.count({ where: { organizationId: org.id } }) : 0,
  }));
  const now = new Date();
  const isAdmin = can({ role }, "events.write");
  const base = `/app/${orgSlug}`;
  const items = polls.map((p) => ({
    open: availabilityOpen(p, now),
    item: availabilityItem(p, base, now, p.createdById === user.id || isAdmin),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find a time"
        description={
          personal
            ? "Offer some days and hours and share the link: anyone marks when they're free, no account needed, and you pick the time."
            : "Offer some days and hours: members and guests mark when they're free, and an owner or admin schedules the best time."
        }
        actions={
          <Button size="sm" asChild>
            <Link href={`${base}/calendar/find-a-time/new`}>
              <Plus aria-hidden className="size-4" />
              New poll
            </Link>
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="No meeting times to pick yet"
          description="Start one with New poll: choose the days, the hours and how long the meeting is, then send the link. You'll see the best times as answers come in."
        />
      ) : (
        <PollList
          orgId={org.id}
          open={items.filter((p) => p.open).map((p) => p.item)}
          closed={items.filter((p) => !p.open).map((p) => p.item)}
        />
      )}

      {questionCount > 0 && (
        <p className="text-muted-foreground text-sm">
          You also have{" "}
          {questionCount === 1 ? "a question poll" : `${questionCount} question polls`}.{" "}
          <Link
            href={`${base}/calendar/polls`}
            className="text-foreground underline underline-offset-2"
          >
            See {questionCount === 1 ? "it" : "them"}
          </Link>
        </p>
      )}
    </div>
  );
}
