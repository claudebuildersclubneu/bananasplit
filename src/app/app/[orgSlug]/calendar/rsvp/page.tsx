import { ChevronRight, Ticket } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BackLink } from "@/components/back-link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { can } from "@/lib/auth/permissions";
import { safeTimeZone } from "@/lib/calendar/dates";
import { rsvpCover } from "@/lib/rsvp/cover";
import { whenLine } from "@/lib/rsvp/when";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";

/**
 * Every event with an RSVP page (on, or once on), coming up first: the
 * club's Luma-style event list, with sign-ups at a glance. Owners and admins.
 */
export default async function RsvpPagesList({ params }: PageProps<"/app/[orgSlug]/calendar/rsvp">) {
  const { orgSlug } = await params;
  const ctx = await getOrgContextBySlug(orgSlug);
  if (!can(ctx, "events.write")) redirect(`/app/${orgSlug}/calendar`);
  const { organization: org } = ctx;
  const timeZone = safeTimeZone(org.timezone);
  const now = new Date();

  const { events, counts } = await withOrgTx(org.id, async ({ db }) => {
    const events = await db.event.findMany({
      where: { organizationId: org.id, deletedAt: null, rsvpSlug: { not: null } },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
        allDay: true,
        rsvpEnabled: true,
        rsvpCapacity: true,
        rsvpCover: true,
      },
    });
    const counts = await db.eventRegistration.groupBy({
      by: ["eventId", "status"],
      where: {
        organizationId: org.id,
        eventId: { in: events.map((e) => e.id) },
        status: { in: ["GOING", "WAITLIST"] },
      },
      _count: { _all: true },
    });
    return { events, counts };
  });
  const countOf = (eventId: string, status: string) =>
    counts.find((c) => c.eventId === eventId && c.status === status)?._count._all ?? 0;
  const upcoming = events.filter((e) => e.endsAt > now);
  const past = events.filter((e) => e.endsAt <= now).reverse();

  const list = (items: typeof events) => (
    <ul className="divide-y overflow-hidden rounded-xl border">
      {items.map((e) => {
        const cover = rsvpCover(e.rsvpCover);
        const going = countOf(e.id, "GOING");
        const waiting = countOf(e.id, "WAITLIST");
        return (
          <li key={e.id}>
            <Link
              href={`/app/${orgSlug}/calendar/${e.id}/rsvp`}
              className="bg-card hover:bg-muted/50 flex items-center gap-4 p-3 transition-colors"
            >
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element -- a stored WebP variant
                <img
                  src={cover.s480}
                  alt=""
                  className="size-14 flex-none rounded-lg object-cover"
                />
              ) : (
                <span className="bg-peel font-heading text-ink grid size-14 flex-none place-items-center rounded-lg text-xl">
                  {e.title.trim()[0]?.toUpperCase() ?? "B"}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium">{e.title}</span>
                  {!e.rsvpEnabled && <Badge variant="outline">Off</Badge>}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {whenLine(e.startsAt, e.endsAt, timeZone, e.allDay)}
                </span>
              </span>
              <span className="text-right text-sm tabular-nums">
                <span className="font-semibold">{going}</span>
                <span className="text-muted-foreground">
                  {e.rsvpCapacity ? ` / ${e.rsvpCapacity}` : ""} going
                </span>
                {waiting > 0 && (
                  <span className="text-muted-foreground block text-xs">{waiting} waitlisted</span>
                )}
              </span>
              <ChevronRight className="text-muted-foreground size-4 flex-none" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackLink href={`/app/${orgSlug}/calendar`} label="Calendar" />
      <PageHeader
        title="RSVP pages"
        description="Public sign-up pages for your events. Make one from New event, or from any event's page."
      />
      {events.length === 0 ? (
        <EmptyState
          title="No RSVP pages yet"
          description={
            <>
              Open an event and choose{" "}
              <Ticket className="inline size-3.5 align-[-2px]" aria-hidden="true" /> Set up an RSVP
              page, or turn on Take RSVPs when you make a new one.
            </>
          }
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="space-y-2">
              <h2 className="heading text-sm">Coming up</h2>
              {list(upcoming)}
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-2">
              <h2 className="heading text-muted-foreground text-sm">Past</h2>
              {list(past)}
            </section>
          )}
        </>
      )}
    </div>
  );
}
