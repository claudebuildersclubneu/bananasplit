import { cookies } from "next/headers";

import { appUrl } from "@/lib/app-url";
import { buildIcsCalendar } from "@/lib/ics";
import { loadRsvpPage, rsvpPageTarget } from "@/server/rsvp/page";
import { readRsvpManageKey, rsvpCookieName } from "@/server/rsvp/token";

/**
 * GET /e/{slug}/calendar.ics: the event for a guest's calendar app, with
 * exactly what the page shows them (no address when it is hidden from them).
 */
export const dynamic = "force-dynamic";

const NOT_FOUND = () =>
  new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const target = await rsvpPageTarget(slug);
  if (!target) return NOT_FOUND();
  const viewerId = readRsvpManageKey((await cookies()).get(rsvpCookieName(target.eventId))?.value);
  const page = await loadRsvpPage(slug, target, viewerId);
  if (!page) return NOT_FOUND();

  const pageUrl = appUrl(`/e/${slug}`);
  const description = [page.description, page.locationDetails, page.joinUrl, pageUrl]
    .filter(Boolean)
    .join("\n\n");
  const body = buildIcsCalendar(
    [
      {
        id: page.eventId,
        title: page.title,
        description,
        location: page.location,
        startsAt: page.startsAt,
        endsAt: page.endsAt,
        allDay: page.allDay,
        updatedAt: new Date(),
        url: pageUrl,
      },
    ],
    { name: page.title, timeZone: page.timeZone },
  );
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="event.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
