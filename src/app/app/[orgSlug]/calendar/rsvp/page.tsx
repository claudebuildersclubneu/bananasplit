import { ChevronRight, Plus, Ticket } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TickMeter } from "@/components/ui/meters";
import { shortDayAt } from "@/components/calendar/day-label";
import { can } from "@/lib/auth/permissions";
import { safeTimeZone } from "@/lib/calendar/dates";
import { newRsvpEventHref } from "@/lib/calendar/range";
import { sectionLabel } from "@/lib/nav/sidebar";
import { rsvpCover } from "@/lib/rsvp/cover";
import { timeLine } from "@/lib/rsvp/when";
import { cn } from "@/lib/utils";
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
  // The header's is the screen's one create button; the empty state repeats
  // it quietly.
  const newEvent = (variant: "create" | "secondary") =>
    canManage ? (
      <Button variant={variant} asChild>
        <Link href={newRsvpEventHref(orgSlug)}>
          <Plus aria-hidden="true" />
          New event with RSVPs
        </Link>
      </Button>
    ) : null;

  // The live line: what's taking sign-ups now, and who's coming.
  const openPages = upcoming.filter((e) => e.rsvpEnabled);
  const goingSoon = openPages.reduce((n, e) => n + countOf(e.id, "GOING"), 0);
  const summary = [
    openPages.length > 0 &&
      `${openPages.length} ${openPages.length === 1 ? "page" : "pages"} taking RSVPs`,
    canManage && openPages.length > 0 && `${goingSoon} going`,
    tickets.length > 0 &&
      `${tickets.length} ${tickets.length === 1 ? "ticket" : "tickets"} of yours`,
  ]
    .filter(Boolean)
    .join(" · ");

  const pageList = (items: PageRow[]) => (
    <ul className="bg-card text-card-foreground ring-foreground/6 edge rounded-card p-2 ring-1">
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
          <li key={e.id} className={ROW}>
            <Link
              href={href}
              className="hover:bg-muted rounded-tile focus-glow flex items-center gap-4 p-2.5 transition-colors"
            >
              <Cover title={e.title} cover={e.rsvpCover} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-semibold">{e.title}</span>
                  {!e.rsvpEnabled && <Badge variant="secondary">Off</Badge>}
                </span>
                <span className="text-muted-foreground mt-0.5 block truncate text-[13px]">
                  {listWhen(e.startsAt, e.endsAt, timeZone, e.allDay)}
                </span>
              </span>
              {canManage ? (
                <span className="flex flex-col items-end gap-1.5 text-sm tabular-nums">
                  <span>
                    <span className="font-semibold">{going}</span>
                    <span className="text-muted-foreground">
                      {e.rsvpCapacity ? ` of ${e.rsvpCapacity}` : ""} going
                    </span>
                  </span>
                  {e.rsvpCapacity && e.rsvpCapacity <= 60 ? (
                    <TickMeter
                      total={e.rsvpCapacity}
                      filled={going}
                      height={8}
                      color="var(--success)"
                      label={`${going} of ${e.rsvpCapacity} spots taken`}
                      className="w-24"
                    />
                  ) : null}
                  {waiting > 0 && (
                    <span className="text-muted-foreground text-xs">{waiting} waitlisted</span>
                  )}
                </span>
              ) : mine ? (
                <Badge variant={mine.status === "WAITLIST" ? "accent" : "success"}>
                  {mine.status === "WAITLIST" ? "On the waitlist" : "You're going"}
                </Badge>
              ) : (
                <Badge variant="outline">RSVP</Badge>
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
          // The live line once there is something to count; until then, what this is.
          summary ||
          (personal
            ? "Event pages anyone can RSVP to, no account needed, and every event you've signed up for."
            : canManage
              ? "Public sign-up pages for the club's events, and your own tickets. Start one here, or from any event's page."
              : "The club's events taking sign-ups, and your tickets.")
        }
        actions={newEvent("create")}
      />

      {tickets.length > 0 && (
        <section className="space-y-3" aria-labelledby="tickets-heading">
          <h2 id="tickets-heading" className="heading flex items-center gap-2 text-[17px]">
            Your tickets <Badge variant="secondary">{tickets.length}</Badge>
          </h2>
          <TicketList tickets={tickets} showHost={personal} />
        </section>
      )}

      {events.length === 0 ? (
        canManage ? (
          <EmptyState
            icon={Ticket}
            title="No RSVP pages yet"
            description={
              <>
                Make a new event with a sign-up page, or open one you already have and choose{" "}
                <Ticket className="inline size-3.5 align-[-2px]" aria-hidden="true" /> Set up an
                RSVP page.
              </>
            }
            action={newEvent("secondary")}
          />
        ) : (
          <EmptyState
            icon={Ticket}
            title="Nothing taking sign-ups right now"
            description="When the club opens RSVPs for an event, it shows here and you can sign up in a click."
          />
        )
      ) : canManage ? (
        <>
          {upcoming.length > 0 && (
            <section className="space-y-3" aria-labelledby="upcoming-heading">
              <h2 id="upcoming-heading" className="heading flex items-center gap-2 text-[17px]">
                {personal ? "Your event pages" : "Event pages"}
                <Badge variant="secondary">{upcoming.length}</Badge>
              </h2>
              {pageList(upcoming)}
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-3" aria-labelledby="past-heading">
              <h2
                id="past-heading"
                className="heading text-muted-foreground flex items-center gap-2 text-[17px]"
              >
                Past <Badge variant="secondary">{past.length}</Badge>
              </h2>
              {pageList(past)}
            </section>
          )}
        </>
      ) : (
        <section className="space-y-3" aria-labelledby="open-heading">
          <h2 id="open-heading" className="heading flex items-center gap-2 text-[17px]">
            Taking RSVPs <Badge variant="secondary">{upcoming.length}</Badge>
          </h2>
          {pageList(upcoming)}
        </section>
      )}
    </div>
  );
}

/** A list row: a soft tile on hover, a hairline to the next one, inset past the cover. */
const ROW =
  "relative [&+&]:before:absolute [&+&]:before:top-0 [&+&]:before:right-2.5 [&+&]:before:left-[5.25rem] [&+&]:before:border-t [&+&]:before:border-border/70";

/** "Today, 6:00 – 7:00 PM EDT", "Wed, Oct 14, ...": the day as the app says it. */
function listWhen(start: Date, end: Date, timeZone: string, allDay: boolean): string {
  return `${shortDayAt(start, timeZone)}, ${timeLine(start, end, timeZone, allDay)}`;
}

function Cover({ title, cover: stored }: { title: string; cover: unknown }) {
  const cover = rsvpCover(stored);
  return cover ? (
    // eslint-disable-next-line @next/next/no-img-element -- a stored WebP variant
    <img src={cover.s480} alt="" className="rounded-tile size-14 flex-none object-cover" />
  ) : (
    <span className="bg-tint-accent text-tint-accent-foreground font-heading rounded-tile grid size-14 flex-none place-items-center text-xl">
      {title.trim()[0]?.toUpperCase() ?? "B"}
    </span>
  );
}

function TicketList({ tickets, showHost }: { tickets: RegistrationRow[]; showHost: boolean }) {
  return (
    <ul className="bg-card text-card-foreground ring-foreground/6 edge rounded-card p-2 ring-1">
      {tickets.map((r) => (
        <li key={r.registrationId} className={cn(ROW, "flex items-center gap-4 p-2.5")}>
          <span className="bg-tint-success text-tint-success-foreground grid size-10 flex-none place-items-center rounded-full">
            <Ticket className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <Link
              href={`/e/${r.rsvpSlug}`}
              className="block truncate text-[15px] font-semibold underline-offset-4 hover:underline"
            >
              {r.title}
            </Link>
            <span className="text-muted-foreground mt-0.5 block truncate text-[13px]">
              {listWhen(r.startsAt, r.endsAt, safeTimeZone(r.spaceTimezone), r.allDay)}
              {showHost && r.spaceKind === "CLUB" ? ` · ${r.spaceName}` : ""}
            </span>
          </span>
          {r.status === "WAITLIST" ? (
            <Badge variant="accent">On the waitlist</Badge>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/e/${r.rsvpSlug}/t/${r.ticketCode}`}>
                <Ticket aria-hidden="true" />
                Ticket
              </Link>
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
