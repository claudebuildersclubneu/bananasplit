import { Plus } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PollList } from "@/components/polls/poll-list";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";

import { availabilityItem, availabilityOpen } from "../polls/list-items";
import { getOrgPolls } from "../queries";

/**
 * Find a time: every availability poll in the org, newest first, split
 * into open and closed (a scheduled one counts as closed). Its own section
 * in the sidebar's Club heading, beside Polls.
 */
export default async function FindATimePage({
  params,
}: PageProps<"/app/[orgSlug]/calendar/find-a-time">) {
  const { orgSlug } = await params;

  const { organization: org, user, role } = await getOrgContextBySlug(orgSlug);
  const polls = await withOrgTx(org.id, ({ db }) => getOrgPolls(db, org.id));
  const now = new Date();
  const isAdmin = can({ role }, "events.write");
  const base = `/app/${orgSlug}/calendar/find-a-time`;

  const all = polls.map((p) => ({
    open: availabilityOpen(p, now),
    item: availabilityItem(p, base, now, p.createdById === user.id || isAdmin),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find a time"
        description="Offer some days and hours, and see when most people are free."
        actions={
          <Button asChild size="sm">
            <Link href={`${base}/new`}>
              <Plus aria-hidden className="size-4" />
              Find a time
            </Link>
          </Button>
        }
      />

      {all.length === 0 ? (
        <EmptyState
          title="Nothing to schedule yet"
          description="Pick the days and hours that could work, share the link, and everyone marks when they're free. Guests can answer without an account."
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
