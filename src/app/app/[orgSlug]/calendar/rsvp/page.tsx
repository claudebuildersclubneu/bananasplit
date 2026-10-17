import { ChevronRight, Plus, Ticket } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";
import { safeTimeZone } from "@/lib/calendar/dates";
import { newRsvpEventHref } from "@/lib/calendar/range";
import { sectionLabel } from "@/lib/nav/sidebar";
import { rsvpCover } from "@/lib/rsvp/cover";
import { whenLine } from "@/lib/rsvp/when";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { myRsvpRegistrations, type RegistrationRow } from "@/server/rsvp/my-registrations";

/** Your sign-ups read for this page (the lookup's own ceiling). */
const MY_TICKETS = 50;

interface PageRow {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  rsvpEnabled: boolean;
  rsvpSlug: string | null;
  rsvpCapacity: number | null;
  rsvpCover: unknown;
}

/**
 * RSVPs, its own sidebar section in Personal and in every club:
 * - Your tickets: events you're going to or waitlisted for. In Personal,
 *   every one of them; in a club, the club's.
 * - Owners and admins (and you, in Personal): every event with an RSVP page,
 *   coming up first, with sign-ups at a glance; each opens its guest list
 *   and page settings.
 * - Everyone else in a club: the club's events taking sign-ups now, each
 *   opening its public page to sign up there.
 */
export default async function RsvpsPage({ params }: PageProps<"/app/[orgSlug]/calendar/rsvp">) {
  const { orgSlug } = await params;
  const ctx = await getOrgContextBySlug(orgSlug);
  const { organization: org, user } = ctx;
  const personal = org.kind === "PERSONAL";
  const canManage = can(ctx, "events.write");
  const timeZone = safeTimeZone(org.timezone);
  const now = new Date();

  const [{ events, counts }, registrations] = await Promise.all([
    withOrgTx(org.id, async ({ db }) => {
      const events: PageRow[] = await db.event.findMany({
        where: {
          organizationId: org.id,
          deletedAt: null,
          rsvpSlug: { not: null },
          // Members see what they can sign up for: pages that are on, still to come.
          ...(canManage ? {} : { rsvpEnabled: true, endsAt: { gt: now } }),
        },
        orderBy: { startsAt: "asc" },
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          allDay: true,
          rsvpEnabled: true,
          rsvpSlug: true,
          rsvpCapacity: true,
          rsvpCover: true,
        },
      });
      // Head counts are the hosts' view.
      const counts = canManage
        ? await db.eventRegistration.groupBy({
            by: ["eventId", "status"],
            where: {
              organizationId: org.id,
              eventId: { in: events.map((e) => e.id) },
              status: { in: ["GOING", "WAITLIST"] },
            },
            _count: { _all: true },
          })
        : [];
      return { events, counts };
    }),
    myRsvpRegistrations(user.id, MY_TICKETS),
  ]);

  const countOf = (eventId: string, status: string) =>
    counts.find((c) => c.eventId === eventId && c.status === status)?._count._all ?? 0;
  const here = new Set(events.map((e) => e.id));
  const tickets = personal ? registrations : registrations.filter((r) => here.has(r.eventId));
  const ticketFor = new Map(tickets.map((r) => [r.eventId, r]));
  const upcoming = events.filter((e) => e.endsAt > now);
  const past = events.filter((e) => e.endsAt <= now).reverse();
  // Whoever can make events: the Calendar's New event, with the RSVP page on.
  const newEvent = canManage ? (
    <Button size="sm" asChild>
      <Link href={newRsvpEventHref(orgSlug)}>
        <Plus aria-hidden="true" />
        New event with RSVPs
      </Link>
    </Button>
  ) : null;

  const pageList = (items: PageRow[]) => (
    <ul className="divide-y overflow-hidden rounded-xl border">
      {items.map((e) => {
        const going = countOf(e.id, "GOING");
        const waiting = countOf(e.id, "WAITLIST");
        const mine = ticketFor.get(e.id);
        const href = canManage
          ? `/app/${orgSlug}/calendar/${e.id}/rsvp`
          : e.rsvpSlug
            ? `/e/${e.rsvpSlug}`
            : `/app/${orgSlug}/calendar/${e.id}`;
        return (
          <li key={e.id}>
            <Link
              href={href}
              className="bg-card hover:bg-muted/50 flex items-center gap-4 p-3 transition-colors"
            >
              <Cover title={e.title} cover={e.rsvpCover} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium">{e.title}</span>
                  {!e.rsvpEnabled && <Badge variant="outline">Off</Badge>}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {whenLine(e.startsAt, e.endsAt, timeZone, e.allDay)}
                </span>
              </span>
              {canManage ? (
                <span className="text-right text-sm tabular-nums">
                  <span className="font-semibold">{going}</span>
                  <span className="text-muted-foreground">
                    {e.rsvpCapacity ? ` / ${e.rsvpCapacity}` : ""} going
                  </span>
                  {waiting > 0 && (
                    <span className="text-muted-foreground block text-xs">
                      {waiting} waitlisted
                    </span>
                  )}
                </span>
              ) : mine ? (
                <Badge variant="secondary">
                  {mine.status === "WAITLIST" ? "On the waitlist" : "You're going"}
                </Badge>
              ) : (
                <span className="text-primary text-sm font-medium">RSVP</span>
              )}
              <ChevronRight className="text-muted-foreground size-4 flex-none" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title={sectionLabel(ctx.settings?.sidebar, "rsvps")}
        description={
          personal
            ? "Event pages anyone can RSVP to, no account needed, and every event you've signed up for."
            : canManage
              ? "Public sign-up pages for the club's events, and your own tickets. Start one here, or from any event's page."
              : "The club's events taking sign-ups, and your tickets."
        }
        actions={newEvent}
      />

      {tickets.length > 0 && (
        <section className="space-y-2" aria-labelledby="tickets-heading">
          <h2 id="tickets-heading" className="heading text-sm">
            Your tickets
          </h2>
          <TicketList tickets={tickets} showHost={personal} />
        </section>
      )}

      {events.length === 0 ? (
        canManage ? (
          <EmptyState
            title="No RSVP pages yet"
            description={
              <>
                Make a new event with a sign-up page, or open one you already have and choose{" "}
                <Ticket className="inline size-3.5 align-[-2px]" aria-hidden="true" /> Set up an
                RSVP page.
              </>
            }
            action={newEvent}
          />
        ) : (
          <EmptyState
            title="Nothing taking sign-ups right now"
            description="When the club opens RSVPs for an event, it shows here and you can sign up in a click."
          />
        )
      ) : canManage ? (
        <>
          {upcoming.length > 0 && (
            <section className="space-y-2" aria-labelledby="upcoming-heading">
              <h2 id="upcoming-heading" className="heading text-sm">
                {personal ? "Your event pages" : "Event pages"}
              </h2>
              {pageList(upcoming)}
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-2" aria-labelledby="past-heading">
              <h2 id="past-heading" className="heading text-muted-foreground text-sm">
                Past
              </h2>
              {pageList(past)}
            </section>
          )}
        </>
      ) : (
        <section className="space-y-2" aria-labelledby="open-heading">
          <h2 id="open-heading" className="heading text-sm">
            Taking RSVPs
          </h2>
          {pageList(upcoming)}
        </section>
      )}
    </div>
  );
}

function Cover({ title, cover: stored }: { title: string; cover: unknown }) {
  const cover = rsvpCover(stored);
  return cover ? (
    // eslint-disable-next-line @next/next/no-img-element -- a stored WebP variant
    <img src={cover.s480} alt="" className="size-14 flex-none rounded-lg object-cover" />
  ) : (
    <span className="bg-banana font-heading text-banana-ink grid size-14 flex-none place-items-center rounded-lg text-xl">
      {title.trim()[0]?.toUpperCase() ?? "B"}
    </span>
  );
}

function TicketList({ tickets, showHost }: { tickets: RegistrationRow[]; showHost: boolean }) {
  return (
    <ul className="bg-card divide-y overflow-hidden rounded-xl border">
      {tickets.map((r) => (
        <li key={r.registrationId} className="flex items-center gap-4 p-3">
          <span className="min-w-0 flex-1">
            <Link href={`/e/${r.rsvpSlug}`} className="block truncate font-medium hover:underline">
              {r.title}
            </Link>
            <span className="text-muted-foreground block truncate text-xs">
              {whenLine(r.startsAt, r.endsAt, safeTimeZone(r.spaceTimezone), r.allDay)}
              {showHost && r.spaceKind === "CLUB" ? ` · ${r.spaceName}` : ""}
            </span>
          </span>
          {r.status === "WAITLIST" ? (
            <Badge variant="secondary">On the waitlist</Badge>
          ) : (
            <Link
              href={`/e/${r.rsvpSlug}/t/${r.ticketCode}`}
              className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
            >
              <Ticket className="size-4" aria-hidden="true" />
              Ticket
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
