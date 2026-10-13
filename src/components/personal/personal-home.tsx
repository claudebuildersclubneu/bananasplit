import {
  ArrowRight,
  Bell,
  CalendarDays,
  CalendarRange,
  CircleCheck,
  KeyRound,
  ListChecks,
  MapPin,
  Plus,
  Ticket,
  UserRound,
  Vote,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { KIND_META, RSVP_META } from "@/components/calendar/kinds";
import { EmptyState } from "@/components/empty-state";
import { PendingInviteCard } from "@/app/onboarding/pending-invite-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatEventWhen } from "@/lib/calendar/format";
import { PROFILE_STEP_TITLES } from "@/lib/onboarding/steps";
import { orgLogoUrl } from "@/lib/org-logo";
import { DUE_SOON_DAYS, UPCOMING_DAYS } from "@/lib/personal/home-windows";
import { dateTile } from "@/lib/rsvp/when";
import { formatDueKey } from "@/lib/tasks/dates";
import type {
  DueBucket,
  PersonalHomeClub,
  PersonalHomeData,
  ProfileGap,
} from "@/server/personal/home";

import { DueTaskRow } from "./due-task-row";

/**
 * The Personal space's home (/app/{personal slug}): the Personal dashboard
 * of docs/features/personal-and-clubs.md. Invites and "Finish your profile"
 * first, then your clubs, when you meet next and what's due on the left;
 * your RSVPs and polls on the right. Every list says what goes in it and
 * how to put something there when it's empty. Data: loadPersonalHome
 * (src/server/personal/home.ts).
 */
export function PersonalHome({
  data,
  orgSlug,
  now = new Date(),
}: {
  data: PersonalHomeData;
  orgSlug: string;
  now?: Date;
}) {
  const base = `/app/${orgSlug}`;
  const dateLine = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: data.timeZone,
  }).format(now);

  return (
    <div className="max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="eyebrow text-muted-foreground mb-2">{dateLine}</p>
          <h1 className="page-title">
            {greeting(now, data.timeZone)}
            {data.firstName ? `, ${data.firstName}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Your clubs, plans and to-dos in one place. Only you can see Personal.
          </p>
        </div>
        <nav aria-label="Personal" className="flex flex-wrap items-center gap-1">
          <Button asChild size="sm" variant="ghost">
            <Link href={`${base}/tasks`}>Tasks</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={`${base}/calendar`}>Calendar</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={`${base}/calendar/polls`}>Polls</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={`${base}/calendar/rsvp`}>Event pages</Link>
          </Button>
        </nav>
      </header>

      {data.pendingInvites.length > 0 && (
        <section aria-labelledby="invites-heading" className="space-y-3">
          <SectionTitle id="invites-heading" icon={Bell}>
            {data.pendingInvites.length === 1
              ? "You're invited to a club"
              : `You're invited to ${data.pendingInvites.length} clubs`}
          </SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {data.pendingInvites.map((invitation) => (
              <PendingInviteCard
                key={invitation.id}
                invitation={{
                  id: invitation.id,
                  role: invitation.role,
                  orgName: invitation.orgName,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {data.finishProfileHref && (
        <FinishProfileCard href={data.finishProfileHref} gaps={data.profileGaps} />
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <ClubsSection data={data} now={now} />
          <UpcomingSection data={data} now={now} base={base} />
          <DueSoonSection data={data} base={base} />
        </div>
        <div className="space-y-6">
          <RsvpsCard data={data} now={now} base={base} />
          <PollsCard data={data} now={now} base={base} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- pieces

function greeting(now: Date, timeZone: string): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(now),
  );
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function SectionTitle({
  id,
  icon: Icon,
  children,
  action,
}: {
  id: string;
  icon: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="heading flex items-center gap-2 text-base">
        <Icon className="text-muted-foreground size-4" aria-hidden="true" />
        {children}
      </h2>
      {action}
    </div>
  );
}

/** "Personal" or the club's name, beside an item from that space. */
function SpaceTag({ name }: { name: string }) {
  return (
    <span className="text-muted-foreground inline-flex max-w-40 min-w-0 items-center gap-1.5 text-xs">
      <span className="bg-primary/60 size-1.5 shrink-0 rounded-full" aria-hidden="true" />
      <span className="truncate">{name}</span>
    </span>
  );
}

const GAP_LABEL: Record<ProfileGap, string> = {
  school: "school",
  bio: "bio and links",
  availability: "when you can't meet",
};

function FinishProfileCard({ href, gaps }: { href: string; gaps: ProfileGap[] }) {
  const missing = gaps.map((g) => GAP_LABEL[g]);
  const list =
    missing.length > 1
      ? `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`
      : missing[0];
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="text-primary size-4" aria-hidden="true" />
          Finish your profile
        </CardTitle>
        <CardDescription>
          Add your {list}. Clubs you join see your profile, and officers plan meetings around when
          you&apos;re free. A minute or two; skip anything you like.
        </CardDescription>
        <CardAction>
          <Button asChild size="sm">
            <Link href={href}>
              {PROFILE_STEP_TITLES[gaps[0]]}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

// ---------------------------------------------------------------- clubs

function ClubsSection({ data, now }: { data: PersonalHomeData; now: Date }) {
  const hasClubs = data.clubs.length > 0;
  return (
    <section aria-labelledby="clubs-heading" className="space-y-3">
      <SectionTitle id="clubs-heading" icon={UserRound}>
        Your clubs
      </SectionTitle>
      {!hasClubs && (
        <p className="text-muted-foreground max-w-prose text-sm">
          A club shares one calendar, task board and set of polls. Joining is always free: ask an
          officer for your club&apos;s code, or start one and invite your people.
        </p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {data.clubs.map((club) => (
          <li key={club.id}>
            <ClubCard club={club} viewerZone={data.timeZone} now={now} />
          </li>
        ))}
        <li>
          <JoinClubCard prominent={!hasClubs} />
        </li>
        <li>
          <Link
            href="/onboarding/organization"
            className="hover:border-foreground/30 hover:bg-muted/40 flex h-full min-h-28 flex-col justify-between gap-3 rounded-xl border border-dashed p-4 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Plus className="size-4" aria-hidden="true" />
              Start a club
            </span>
            <span className="text-muted-foreground text-xs">
              Set up your club&apos;s calendar, tasks and members. Free for 30 days.
            </span>
          </Link>
        </li>
      </ul>
      {data.moreClubs > 0 && (
        <p className="text-muted-foreground text-xs">
          And {data.moreClubs} more: switch to them from the club menu in the sidebar.
        </p>
      )}
    </section>
  );
}

function roleLine(club: PersonalHomeClub): string {
  const role = club.role.charAt(0) + club.role.slice(1).toLowerCase();
  return club.title ? `${club.title} · ${role}` : role;
}

function ClubCard({
  club,
  viewerZone,
  now,
}: {
  club: PersonalHomeClub;
  viewerZone: string;
  now: Date;
}) {
  const logo = orgLogoUrl(club.logo, 64);
  return (
    <Link
      href={`/app/${club.slug}`}
      className="bg-card ring-foreground/10 hover:ring-foreground/25 group flex h-full flex-col gap-3 rounded-xl p-4 ring-1 transition-shadow"
    >
      <span className="flex items-center gap-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP variant
          <img src={logo} alt="" width={36} height={36} className="size-9 rounded-lg" />
        ) : (
          <span className="bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded-lg text-xs font-semibold">
            {club.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium">{club.name}</span>
            {club.paused && <Badge variant="secondary">Paused</Badge>}
          </span>
          <span className="text-muted-foreground block truncate text-xs">{roleLine(club)}</span>
        </span>
        <ArrowRight
          className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
      <span className="text-muted-foreground flex items-start gap-1.5 text-xs">
        <CalendarDays className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        {club.nextMeeting ? (
          <span className="min-w-0">
            <span className="text-foreground">{club.nextMeeting.title}</span>
            <span className="block">
              {formatEventWhen(club.nextMeeting, { viewer: viewerZone, org: club.timeZone }, now)}
            </span>
          </span>
        ) : (
          <span>No meeting on the calendar</span>
        )}
      </span>
      <span className="text-muted-foreground mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1">
          <ListChecks className="size-3.5" aria-hidden="true" />
          {club.openTasks === 0
            ? "No open tasks"
            : `${club.openTasks} open task${club.openTasks === 1 ? "" : "s"}`}
        </span>
        {club.unread > 0 && (
          <span className="text-foreground inline-flex items-center gap-1">
            <span className="bg-primary size-1.5 rounded-full" aria-hidden="true" />
            {club.unread} unread
          </span>
        )}
      </span>
    </Link>
  );
}

/** Join with a code, right here: the join page checks it and shows the club first. */
function JoinClubCard({ prominent }: { prominent: boolean }) {
  return (
    <form
      action="/onboarding/join"
      method="get"
      className={
        prominent
          ? "border-primary/30 bg-primary/5 flex h-full min-h-28 flex-col justify-between gap-3 rounded-xl border p-4"
          : "flex h-full min-h-28 flex-col justify-between gap-3 rounded-xl border border-dashed p-4"
      }
    >
      <label htmlFor="join-code" className="flex items-center gap-2 text-sm font-medium">
        <KeyRound className="size-4" aria-hidden="true" />
        Join a club
      </label>
      <span className="flex gap-2">
        <Input
          id="join-code"
          name="code"
          placeholder="Club code"
          autoComplete="off"
          spellCheck={false}
          maxLength={20}
          className="h-8 font-mono uppercase placeholder:font-sans placeholder:normal-case"
        />
        <Button type="submit" size="sm" variant={prominent ? "default" : "outline"}>
          Join
        </Button>
      </span>
      <span className="text-muted-foreground text-xs">
        You&apos;ll see the club before you join. Joining is free.
      </span>
    </form>
  );
}

// ---------------------------------------------------------------- when you meet

function UpcomingSection({ data, now, base }: { data: PersonalHomeData; now: Date; base: string }) {
  return (
    <section aria-labelledby="upcoming-heading" className="space-y-3">
      <SectionTitle
        id="upcoming-heading"
        icon={CalendarDays}
        action={
          <Link href={`${base}/calendar`} className="text-muted-foreground text-sm hover:underline">
            Your calendar
          </Link>
        }
      >
        When you meet next
      </SectionTitle>
      {data.upcoming.length === 0 ? (
        <EmptyState
          size="compact"
          title={`Nothing in the next ${UPCOMING_DAYS} days`}
          description={
            data.clubs.length > 0
              ? "Meetings and events from your clubs and your own calendar show here, soonest first."
              : "Your own plans and, once you join a club, its meetings and events show here."
          }
          action={
            <Button asChild size="sm" variant="outline">
              <Link href={`${base}/calendar`}>Add something to your calendar</Link>
            </Button>
          }
        />
      ) : (
        <ul className="bg-card ring-foreground/10 divide-y rounded-xl ring-1">
          {data.upcoming.map((event) => {
            const tile = dateTile(
              event.startsAt,
              event.allDay ? event.space.timeZone : data.timeZone,
            );
            return (
              <li key={`${event.space.id}:${event.id}`}>
                <Link
                  href={event.href}
                  className="hover:bg-muted/40 flex items-center gap-4 px-4 py-3 transition-colors"
                >
                  <span className="bg-muted grid w-11 shrink-0 place-items-center rounded-lg py-1.5 text-center">
                    <span className="eyebrow text-muted-foreground">{tile.month}</span>
                    <span className="numeral text-xl">{tile.day}</span>
                  </span>
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{event.title}</span>
                      {event.rsvp && (
                        <span className="text-muted-foreground shrink-0 text-xs">
                          · {RSVP_META[event.rsvp].short}
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {formatEventWhen(
                        event,
                        { viewer: data.timeZone, org: event.space.timeZone },
                        now,
                      )}
                    </span>
                    <span className="text-muted-foreground flex min-w-0 items-center gap-1 text-xs">
                      <span className="shrink-0">{KIND_META[event.kind].label}</span>
                      {event.location && (
                        <>
                          <span aria-hidden="true">·</span>
                          <MapPin className="size-3 shrink-0" aria-hidden="true" />
                          <span className="truncate">{event.location}</span>
                        </>
                      )}
                    </span>
                  </span>
                  <SpaceTag name={event.space.name} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- due soon

const BUCKETS: { key: DueBucket; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "soon", label: `Next ${DUE_SOON_DAYS - 1} days` },
];

function DueSoonSection({ data, base }: { data: PersonalHomeData; base: string }) {
  const more = data.dueSoonTotal - data.dueSoon.length;
  return (
    <section aria-labelledby="due-heading" className="space-y-3">
      <SectionTitle
        id="due-heading"
        icon={ListChecks}
        action={
          <Link href={`${base}/tasks`} className="text-muted-foreground text-sm hover:underline">
            Your tasks
          </Link>
        }
      >
        Due soon
      </SectionTitle>
      {data.dueSoon.length === 0 ? (
        <EmptyState
          size="compact"
          title="Nothing due this week"
          description="Your own tasks and the ones you're on in your clubs show here when they're due within a week, or overdue."
          action={
            <Button asChild size="sm" variant="outline">
              <Link href={`${base}/tasks`}>
                <CircleCheck className="size-4" aria-hidden="true" />
                Add a task
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="bg-card ring-foreground/10 space-y-3 rounded-xl px-4 py-3 ring-1">
          {BUCKETS.map(({ key, label }) => {
            const tasks = data.dueSoon.filter((t) => t.bucket === key);
            if (tasks.length === 0) return null;
            return (
              <div key={key}>
                <h3
                  className={
                    key === "overdue" ? "eyebrow text-destructive" : "eyebrow text-muted-foreground"
                  }
                >
                  {label}
                </h3>
                <ul className="divide-y">
                  {tasks.map((task) => (
                    <li key={`${task.space.id}:${task.id}`}>
                      <DueTaskRow
                        orgId={task.space.id}
                        taskId={task.id}
                        title={task.title}
                        href={task.href}
                        space={task.space.name}
                        due={key === "today" ? "Today" : formatDueKey(task.dueKey, data.todayKey)}
                        overdue={key === "overdue"}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {more > 0 && (
            <p className="text-muted-foreground text-xs">
              And {more} more.{" "}
              <Link href={`${base}/tasks`} className="hover:underline">
                See your tasks
              </Link>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- RSVPs

function RsvpsCard({ data, now, base }: { data: PersonalHomeData; now: Date; base: string }) {
  const empty = data.rsvps.length === 0 && data.hosting.length === 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Ticket className="text-muted-foreground size-4" aria-hidden="true" />
          Your RSVPs
        </CardTitle>
        <CardAction>
          <Link
            href={`${base}/calendar/rsvp`}
            className="text-muted-foreground text-sm hover:underline"
          >
            Event pages
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {empty ? (
          <EmptyState
            size="compact"
            className="py-0"
            title="No RSVPs yet"
            description="Events you sign up for show here with your ticket. Hosting something? Make an event page anyone can RSVP to, no account needed."
            action={
              <Button asChild size="sm" variant="outline">
                <Link href={`${base}/calendar/rsvp`}>Make an event page</Link>
              </Button>
            }
          />
        ) : (
          <>
            {data.rsvps.length > 0 && (
              <div>
                <h3 className="eyebrow text-muted-foreground">Going</h3>
                <ul className="divide-y">
                  {data.rsvps.map((r) => (
                    <li key={r.registrationId} className="flex items-start gap-3 py-2">
                      <span className="min-w-0 flex-1">
                        <Link
                          href={r.pageHref}
                          className="block truncate text-sm font-medium hover:underline"
                        >
                          {r.title}
                        </Link>
                        <span className="text-muted-foreground block text-xs">
                          {formatEventWhen(r, { viewer: data.timeZone, org: r.timeZone }, now)}
                        </span>
                        {r.host && <SpaceTag name={r.host} />}
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        {r.status === "WAITLIST" ? (
                          <Badge variant="secondary">Waitlist</Badge>
                        ) : (
                          <Link
                            href={r.ticketHref}
                            className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
                          >
                            <Ticket className="size-3.5" aria-hidden="true" />
                            Ticket
                          </Link>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.hosting.length > 0 && (
              <div>
                <h3 className="eyebrow text-muted-foreground">You&apos;re hosting</h3>
                <ul className="divide-y">
                  {data.hosting.map((page) => (
                    <li key={page.id}>
                      <Link
                        href={page.manageHref}
                        className="hover:bg-accent/50 -mx-2 flex items-start gap-3 rounded-md px-2 py-2"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{page.title}</span>
                          <span className="text-muted-foreground block text-xs">
                            {formatEventWhen(
                              page,
                              { viewer: data.timeZone, org: data.timeZone },
                              now,
                            )}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-xs">
                          <span className="block font-medium">
                            {page.going}
                            {page.capacity !== null ? ` / ${page.capacity}` : ""} going
                          </span>
                          {page.waitlist > 0 && (
                            <span className="text-muted-foreground block">
                              {page.waitlist} waitlisted
                            </span>
                          )}
                          {!page.enabled && (
                            <span className="text-muted-foreground block">Page off</span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------- polls

function closesLine(closesAt: Date | null, now: Date): string {
  if (!closesAt) return "Open";
  const days = Math.ceil((closesAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 1) return "Closes within a day";
  return `Closes in ${days} days`;
}

function PollsCard({ data, now, base }: { data: PersonalHomeData; now: Date; base: string }) {
  const empty = data.pollsWaiting.length === 0 && data.ownPolls.length === 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Vote className="text-muted-foreground size-4" aria-hidden="true" />
          Polls
        </CardTitle>
        <CardAction>
          <Link
            href={`${base}/calendar/polls`}
            className="text-muted-foreground text-sm hover:underline"
          >
            Your polls
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {empty ? (
          <EmptyState
            size="compact"
            className="py-0"
            title="No polls waiting"
            description="Polls in your clubs that need your answer show here. To find a time with anyone, send a poll: they answer from a link, no account needed."
            action={
              <Button asChild size="sm" variant="outline">
                <Link href={`${base}/calendar/polls/new`}>Find a time</Link>
              </Button>
            }
          />
        ) : (
          <>
            {data.pollsWaiting.length > 0 && (
              <div>
                <h3 className="eyebrow text-muted-foreground">Waiting on you</h3>
                <ul className="divide-y">
                  {data.pollsWaiting.map((p) => {
                    const Icon = p.kind === "question" ? Vote : CalendarRange;
                    return (
                      <li key={`${p.space.id}:${p.id}`}>
                        <Link
                          href={p.href}
                          className="hover:bg-accent/50 -mx-2 flex items-start gap-2.5 rounded-md px-2 py-2"
                        >
                          <Icon
                            className="text-muted-foreground mt-0.5 size-4 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{p.title}</span>
                            <span className="text-muted-foreground block text-xs">
                              {p.kind === "question" ? "Vote" : "Mark when you're free"} ·{" "}
                              {closesLine(p.closesAt, now)}
                            </span>
                          </span>
                          <SpaceTag name={p.space.name} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {data.ownPolls.length > 0 && (
              <div>
                <h3 className="eyebrow text-muted-foreground">Yours</h3>
                <ul className="divide-y">
                  {data.ownPolls.map((p) => (
                    <li key={`${p.space.id}:${p.id}`}>
                      <Link
                        href={p.href}
                        className="hover:bg-accent/50 -mx-2 flex items-start gap-2.5 rounded-md px-2 py-2"
                      >
                        <CalendarRange
                          className="text-muted-foreground mt-0.5 size-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{p.title}</span>
                          <span className="text-muted-foreground block text-xs">
                            {p.respondents === 0 ? "No answers yet" : `${p.respondents} answered`} ·{" "}
                            {closesLine(p.closesAt, now)}
                          </span>
                        </span>
                        <SpaceTag name={p.space.name} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
