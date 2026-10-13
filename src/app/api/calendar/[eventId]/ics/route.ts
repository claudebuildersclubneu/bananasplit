import { NextResponse } from "next/server";

import { NotFoundError } from "@/lib/auth/errors";
import { getSession } from "@/lib/auth/session";
import { icsEventSelect, toIcsEvent, type IcsEventRow } from "@/lib/calendar-feed";
import { buildIcsCalendar } from "@/lib/ics";
import { contentDisposition } from "@/lib/http/content-disposition";
import { withOrgTx, withUserTx } from "@/server/db/context";

const EVENT_ID = /^[A-Za-z0-9_-]{1,100}$/;
const ORG_ID = /^[A-Za-z0-9_-]{1,100}$/;

/**
 * One event as a downloadable .ics, for a signed-in member of its org.
 *
 * An event is readable only inside its own org's context (RLS), and its org
 * is not in this URL's path, so the event page adds ?org=<its org id>: the
 * event is then read in that one transaction. Without the hint (an older
 * link) or with a wrong one, each of the user's orgs is tried in turn. The
 * hint only picks where to look first: withOrgTx still requires membership
 * and RLS still decides what is visible, so another org's event is simply
 * not found either way.
 */
export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!EVENT_ID.test(eventId)) return new NextResponse("Not found", { status: 404 });

  const hint = new URL(request.url).searchParams.get("org");
  const hinted = hint && ORG_ID.test(hint) ? hint : null;
  if (hinted) {
    const found = await findInOrg(hinted, eventId);
    if (found) return icsResponse(found.row, found.timeZone);
  }

  const orgs = await withUserTx(session.user.id, ({ db }) =>
    db.membership.findMany({
      where: { userId: session.user.id },
      select: { organization: { select: { id: true, timezone: true, deletedAt: true } } },
    }),
  );
  for (const { organization: org } of orgs) {
    if (org.deletedAt || org.id === hinted) continue;
    const row = await withOrgTx(org.id, ({ db }) =>
      db.event.findFirst({
        where: { id: eventId, organizationId: org.id, deletedAt: null },
        select: icsEventSelect,
      }),
    );
    if (row) return icsResponse(row, org.timezone);
  }
  return new NextResponse("Not found", { status: 404 });
}

/** The event in one org the user is a member of, or null (not there, not a member, org deleted). */
async function findInOrg(
  organizationId: string,
  eventId: string,
): Promise<{ row: IcsEventRow; timeZone: string } | null> {
  try {
    return await withOrgTx(organizationId, async ({ db }) => {
      const org = await db.organization.findUnique({
        where: { id: organizationId },
        select: { timezone: true, deletedAt: true },
      });
      if (!org || org.deletedAt) return null;
      const row = await db.event.findFirst({
        where: { id: eventId, organizationId, deletedAt: null },
        select: icsEventSelect,
      });
      return row ? { row, timeZone: org.timezone } : null;
    });
  } catch (error) {
    // Not a member of the hinted org: no different from not finding it there.
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}

function icsResponse(row: IcsEventRow, timeZone: string): NextResponse {
  const ics = buildIcsCalendar([toIcsEvent(row, timeZone)], { timeZone });
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": contentDisposition("attachment", `${row.id}.ics`),
      "Cache-Control": "private, no-store",
    },
  });
}
