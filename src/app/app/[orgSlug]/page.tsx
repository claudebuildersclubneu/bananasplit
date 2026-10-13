import { Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/empty-state";
import { JoinCodeCard } from "@/components/onboarding/join-code-card";
import { GettingStartedCard } from "@/components/overview/getting-started-card";
import { MyTasksCard } from "@/components/overview/my-tasks-card";
import { OverviewBoard } from "@/components/overview/overview-board";
import { PinnedGrid } from "@/components/overview/pinned-grid";
import { UpcomingEventsCard } from "@/components/overview/upcoming-events-card";
import {
  FileList,
  NoteList,
  PeopleList,
  PollList,
  RecentList,
  Shortcuts,
  TaskStats,
  WeekStrip,
  type WeekDay,
} from "@/components/overview/widget-bodies";
import { SetupPrompt } from "@/components/setup/setup-prompt";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUpcomingEvents, getViewerRsvps } from "@/app/app/[orgSlug]/calendar/queries";
import { getRecentNotes } from "@/app/app/[orgSlug]/notes/queries";
import { absoluteAppUrl } from "@/lib/app-url";
import { can } from "@/lib/auth/permissions";
import { handleAuthErrorInPage } from "@/lib/auth/handle-auth-error";
import { safeTimeZone } from "@/lib/calendar/dates";
import { visibleSidebar } from "@/lib/nav/sidebar";
import { overviewWidgetsFor, resolveOverview } from "@/lib/overview/widgets";
import { addDaysToKey, effectiveTimezone, fromDateKey, localDateKey } from "@/lib/tasks/dates";
import { loadSavedBoard } from "@/server/boards";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { listNoteFiles } from "@/server/notes/files";
import { getOrCreateJoinCode } from "@/server/onboarding/join-code";
import { listRecent } from "@/server/pins";
import { listOpenPolls } from "@/server/polls/open-polls";
import { loadSetupState } from "@/server/setup/progress";
import { getMyOpenTasks, taskFilterWhere } from "@/server/tasks/queries";

const MY_TASKS_LIMIT = 8;
const EVENTS_LIMIT = 6;
const RECENT_LIMIT = 8;
const FILES_LIMIT = 6;

function greeting(now: Date, timeZone: string): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(now),
  );
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * The Overview: each member's own board of widgets (their tasks, meetings,
 * events, pins, recent pages, notes, files, people...). Nothing about the
 * club's money is on it. The setup checklist is an admin-only widget.
 */
export default async function OrgOverviewPage({
  params,
  searchParams,
}: PageProps<"/app/[orgSlug]">) {
  const { orgSlug } = await params;
  // ?welcome=1: the end of org setup. The admin's first look at their org
  // shows the invite code and link to share (the flowchart's END).
  const welcome = (await searchParams).welcome === "1";
  // The viewer's own row and pins come with the org context (one transaction
  // the layout shares), so the page does not read them again.
  const {
    organization: org,
    user,
    role,
    settings,
    viewer,
    pins,
  } = await getOrgContextBySlug(orgSlug);
  const canSetUp = can({ role }, "integrations.write");
  const isAdmin = can({ role }, "settings.view");
  const canAddEvents = can({ role }, "events.write");

  // One transaction as the member: the reads run one after another on its
  // connection, and RLS bounds each to the org. The saved board comes first
  // and decides the rest: a widget that is not on it reads nothing.
  const now = new Date();
  const data = await withOrgTx(org.id, async ({ db }) => {
    const tz = effectiveTimezone(viewer, org);
    const dayKey = localDateKey(now, tz);
    const today = fromDateKey(dayKey);
    const saved = await loadSavedBoard(db, org.id, user.id, "overview");
    const shown = new Set(resolveOverview(saved, isAdmin).map((w) => w.type));
    const mine = taskFilterWhere(org.id, { assigneeId: user.id, status: "open" });
    // getMyOpenTasks counts the open and overdue tasks too: the stats reuse them.
    const myTasks =
      shown.has("my-tasks") || shown.has("task-stats")
        ? await getMyOpenTasks(db, org.id, user.id, { limit: MY_TASKS_LIMIT, today })
        : null;
    const events = shown.has("events")
      ? await getUpcomingEvents(db, org.id, now, EVENTS_LIMIT, "events")
      : null;
    const meetings = shown.has("meetings")
      ? await getUpcomingEvents(db, org.id, now, EVENTS_LIMIT, "meetings")
      : null;
    const memberCount =
      shown.has("people") || shown.has("getting-started")
        ? await db.membership.count({ where: { organizationId: org.id } })
        : 0;
    return {
      timeZone: tz,
      todayKey: dayKey,
      firstName: viewer.name?.trim().split(/\s+/)[0] ?? null,
      saved,
      myTasks,
      stats:
        myTasks && shown.has("task-stats")
          ? {
              open: myTasks.total,
              today: await db.task.count({ where: { AND: [mine, { dueDate: today }] } }),
              overdue: myTasks.overdue,
              blocked: await db.task.count({ where: { AND: [mine, { status: "BLOCKED" }] } }),
            }
          : null,
      events,
      meetings,
      weekEvents: shown.has("week") ? await getUpcomingEvents(db, org.id, now, 60) : null,
      rsvps: await getViewerRsvps(
        db,
        org.id,
        user.id,
        [...(events ?? []), ...(meetings ?? [])].map((e) => e.id),
      ),
      pins: shown.has("pinned") ? pins : null,
      recent: shown.has("recent")
        ? await listRecent(db, org.id, org.slug, user.id, RECENT_LIMIT)
        : null,
      notes: shown.has("notes") ? await getRecentNotes(db, org.id, user.id, 6) : null,
      files: shown.has("files") ? await listNoteFiles(db, org.id, { take: FILES_LIMIT }) : null,
      // Questions and find-a-time polls still taking answers, newest first.
      polls: shown.has("polls") ? await listOpenPolls(db, org.id, now, 5) : null,
      people: shown.has("people")
        ? await db.membership.findMany({
            where: { organizationId: org.id },
            select: {
              userId: true,
              title: true,
              user: { select: { id: true, name: true, email: true, image: true, avatar: true } },
            },
            orderBy: { joinedAt: "desc" },
            take: 6,
          })
        : null,
      memberCount,
      setup: canSetUp ? await loadSetupState(db, org.id) : null,
      joinCode:
        welcome && can({ role }, "members.invite")
          ? await getOrCreateJoinCode(db, org.id, user.id)
          : null,
      started:
        isAdmin && shown.has("getting-started")
          ? {
              members: memberCount > 1,
              picture: org.logo != null,
              event:
                (await db.event.count({ where: { organizationId: org.id, deletedAt: null } })) > 0,
              task:
                (await db.task.count({ where: { organizationId: org.id, deletedAt: null } })) > 0,
              budget: (await db.budgetPeriod.count({ where: { organizationId: org.id } })) > 0,
              note:
                (await db.note.count({ where: { organizationId: org.id, deletedAt: null } })) > 0,
            }
          : null,
    };
  }).catch(handleAuthErrorInPage);

  const { timeZone, todayKey } = data;
  const zones = { viewer: timeZone, org: safeTimeZone(org.timezone) };
  const dateLine = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone,
  }).format(now);
  const calendarHref = `/app/${orgSlug}/calendar`;

  // "This week": the next seven days in the viewer's timezone.
  const dayFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
  const weekEvents = data.weekEvents;
  const week: WeekDay[] | null = weekEvents
    ? Array.from({ length: 7 }, (_, i) => {
        const key = addDaysToKey(todayKey, i);
        return {
          key,
          label: i === 0 ? "Today" : dayFmt.format(new Date(`${key}T00:00:00Z`)),
          isToday: i === 0,
          events: weekEvents
            .filter((e) => localDateKey(e.startsAt, timeZone) === key)
            .map((e) => ({
              id: e.id,
              title: e.title,
              time: e.allDay ? "All day" : timeFmt.format(e.startsAt),
            })),
        };
      })
    : null;

  const shortcuts = visibleSidebar(settings?.sidebar)
    .flatMap((g) => g.items)
    .filter((i) => i.id !== "overview")
    .map((i) => ({ id: i.id, label: i.label, href: `/app/${orgSlug}${i.path}` }));

  const eventEmpty = (title: string, description: string, cta: string) => (
    <EmptyState
      size="compact"
      title={title}
      description={description}
      action={
        canAddEvents ? (
          <Button asChild size="sm" variant="outline">
            <Link href={calendarHref}>{cta}</Link>
          </Button>
        ) : undefined
      }
    />
  );

  // Only the widgets whose data was read get a body (the board shows a
  // placeholder for one added in Customize until it is saved).
  const bodies: Record<string, ReactNode> = {
    shortcuts: <Shortcuts links={shortcuts} />,
  };
  if (data.pins) bodies.pinned = <PinnedGrid orgId={org.id} pins={data.pins} />;
  if (data.myTasks) {
    bodies["my-tasks"] = (
      <MyTasksCard
        bare
        orgSlug={orgSlug}
        tasks={data.myTasks.tasks}
        total={data.myTasks.total}
        overdue={data.myTasks.overdue}
        todayKey={todayKey}
      />
    );
  }
  if (data.stats) bodies["task-stats"] = <TaskStats orgSlug={orgSlug} stats={data.stats} />;
  if (data.recent) bodies.recent = <RecentList items={data.recent} now={now} />;
  if (data.meetings) {
    bodies.meetings = (
      <UpcomingEventsCard
        bare
        orgSlug={orgSlug}
        icon={Users}
        events={data.meetings}
        rsvps={data.rsvps}
        zones={zones}
        now={now}
        empty={eventEmpty(
          "No meetings coming up",
          "Team and board meetings on the calendar show here.",
          "Schedule a meeting",
        )}
      />
    );
  }
  if (data.events) {
    bodies.events = (
      <UpcomingEventsCard
        bare
        orgSlug={orgSlug}
        events={data.events}
        rsvps={data.rsvps}
        zones={zones}
        now={now}
        empty={eventEmpty(
          "No events coming up",
          "Socials, workshops and everything else show here.",
          "Add an event",
        )}
      />
    );
  }
  if (week) bodies.week = <WeekStrip orgSlug={orgSlug} days={week} />;
  if (data.polls) bodies.polls = <PollList orgSlug={orgSlug} polls={data.polls} now={now} />;
  if (data.notes) bodies.notes = <NoteList orgSlug={orgSlug} notes={data.notes} />;
  if (data.files) bodies.files = <FileList orgSlug={orgSlug} files={data.files} />;
  if (data.people) {
    bodies.people = <PeopleList orgSlug={orgSlug} people={data.people} total={data.memberCount} />;
  }
  if (data.started) {
    bodies["getting-started"] = <GettingStartedCard orgSlug={orgSlug} state={data.started} />;
  }

  const greetingBlock = (
    <div>
      <p className="eyebrow text-muted-foreground mb-2">{dateLine}</p>
      <h1 className="page-title">
        {greeting(now, timeZone)}
        {data.firstName ? `, ${data.firstName}` : ""}
      </h1>
    </div>
  );

  return (
    <div className="space-y-6">
      <OverviewBoard
        orgId={org.id}
        types={overviewWidgetsFor(isAdmin)}
        initialLayout={resolveOverview(data.saved, isAdmin)}
        customized={data.saved !== null}
        bodies={bodies}
        intro={greetingBlock}
        notice={
          data.joinCode || data.setup ? (
            <>
              {data.joinCode && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="space-y-3">
                    <div>
                      <CardTitle>{org.name} is ready</CardTitle>
                      <CardDescription>
                        Invite your members: share this code or link. They set up their profile,
                        enter it, and see {org.name} before they join. Manage it any time in{" "}
                        <Link
                          href={`/app/${orgSlug}/settings/members`}
                          className="underline underline-offset-4"
                        >
                          Admin panel › Members
                        </Link>
                        .
                      </CardDescription>
                    </div>
                    <JoinCodeCard
                      orgId={org.id}
                      compact
                      joinUrlBase={absoluteAppUrl("/onboarding/join")}
                      initial={{
                        code: data.joinCode.code,
                        enabled: data.joinCode.enabled,
                        allowedDomain: data.joinCode.allowedDomain,
                        useCount: data.joinCode.useCount,
                      }}
                    />
                  </CardHeader>
                </Card>
              )}
              {data.setup ? <SetupPrompt orgSlug={orgSlug} state={data.setup} /> : null}
            </>
          ) : null
        }
      />
    </div>
  );
}
