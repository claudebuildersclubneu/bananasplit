import { NextResponse } from "next/server";

import { feedEventsWhereInOrg, icsEventSelect, toIcsEvent } from "@/lib/calendar-feed";
import { buildIcsCalendar, type IcsEvent } from "@/lib/ics";
import { hashIcsToken } from "@/lib/ics-token";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { authDb } from "@/server/db/clients";
import { withSystemOrgTx, withUserTx } from "@/server/db/context";

// Generous: real calendar apps poll this every 15-60 min, but nothing
// legitimate needs more than one request a minute.
const FEED_RATE_LIMIT = 60;
const FEED_RATE_WINDOW_SEC = 60 * 60;
/** Per org: a personal feed is invitations, not a full calendar. */
const PER_ORG_LIMIT = 500;
/**
 * How far back the feed reaches: events that ended in the last 90 days.
 * Without a floor, years of old invitations filled the cap oldest first and
 * new events stopped appearing; a calendar app keeps what it already has.
 */
const FEED_PAST_DAYS = 90;

/** Test seam: the feed's reads (token -> user, user -> orgs, org -> events). */
export const feedReads = {
  async userByTokenHash(tokenHash: string) {
    // app_auth: UserCredential is readable by no tenant role. Only the hash is stored.
    const credential = await authDb.userCredential.findUnique({
      where: { icsTokenHash: tokenHash },
      select: { user: { select: { id: true, name: true } } },
    });
    return credential?.user ?? null;
  },
  async orgsOf(userId: string) {
    // The user's own memberships (app_user, no org context), live orgs only.
    const rows = await withUserTx(userId, ({ db }) =>
      db.membership.findMany({
        where: { userId },
        select: {
          organization: { select: { id: true, name: true, timezone: true, deletedAt: true } },
        },
      }),
    );
    return rows.map((r) => r.organization).filter((o) => o.deletedAt === null);
  },
  async eventsIn(
    userId: string,
    org: { id: string; timezone: string },
    now: Date = new Date(),
    limit: number = PER_ORG_LIMIT,
  ): Promise<IcsEvent[]> {
    const invited = feedEventsWhereInOrg(userId, org.id);
    const floor = new Date(now.getTime() - FEED_PAST_DAYS * 86_400_000);
    // Service path scoped to that org; the filter re-checks membership.
    const rows = await withSystemOrgTx(org.id, async ({ db }) => {
      // Upcoming and in-progress events first, soonest first, so the cap can
      // only ever cut the far future, never next week's meeting.
      const upcoming = await db.event.findMany({
        where: { AND: [invited, { endsAt: { gt: now } }] },
        select: icsEventSelect,
        orderBy: [{ startsAt: "asc" }, { id: "asc" }],
        take: limit,
      });
      // Recent history fills whatever room is left, latest first.
      const past =
        upcoming.length < limit
          ? await db.event.findMany({
              where: { AND: [invited, { endsAt: { gte: floor, lte: now } }] },
              select: icsEventSelect,
              orderBy: [{ endsAt: "desc" }, { id: "asc" }],
              take: limit - upcoming.length,
            })
          : [];
      return [...past, ...upcoming];
    });
    return rows.map((r) => toIcsEvent(r, org.timezone));
  },
};

/**
 * Public, token-authenticated, read-only feed with no session: the token is
 * the credential (unguessable, regenerable in Settings), so calendar apps
 * can subscribe to it. It lists the events the user is invited to, in the
 * orgs they are STILL a member of (0A Fix 7), from FEED_PAST_DAYS ago on.
 *
 * Read org by org on the service path, one after another: app_service sees
 * one org per transaction, so each org is its own transaction, and running
 * them side by side would only trade a poll that no one waits on for more of
 * a five-connection pool shared with jobs and crons.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Keyed on a hash of the token: the bucket table never holds the credential.
  const tokenHash = hashIcsToken(token);
  const rateLimit = await checkRateLimit(
    rateLimitKey("ics-feed", tokenHash),
    FEED_RATE_LIMIT,
    FEED_RATE_WINDOW_SEC,
  );
  if (!rateLimit.allowed) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const user = await feedReads.userByTokenHash(tokenHash);
  if (!user) {
    return new NextResponse("Not found", { status: 404 });
  }

  const now = new Date();
  const events: IcsEvent[] = [];
  for (const org of await feedReads.orgsOf(user.id)) {
    events.push(...(await feedReads.eventsIn(user.id, org, now)));
  }
  events.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime() || (a.id < b.id ? -1 : 1));

  const ics = buildIcsCalendar(events, {
    name: `${user.name ?? "Bananasplit"} — Bananasplit`,
    refreshMinutes: 60,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
