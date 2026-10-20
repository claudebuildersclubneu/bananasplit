import { BackLink } from "@/components/back-link";
import { LABEL_COLOR_PALETTE } from "@/lib/label-colors";
import { sectionLabel } from "@/lib/nav/sidebar";
import { effectiveTimezone, fromDateKey, localDateKey } from "@/lib/tasks/dates";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { getOrgMembersForPicker } from "@/server/members";
import { chartPalette } from "@/server/tasks/catalog";
import { getEpicsOverview } from "@/server/tasks/queries";

import { EpicsView } from "./epics-view";

/**
 * Tasks > Epics: every epic as a card (its colour, owner, dates and how much
 * of its work is done), with New epic. An epic's own view is the List
 * filtered to it (?epic=). Epics are tasks, so who may edit one is the
 * task rules' call (updateTask decides).
 */
export default async function EpicsPage({ params }: PageProps<"/app/[orgSlug]/tasks/epics">) {
  const { orgSlug } = await params;
  const { organization: org, user, settings } = await getOrgContextBySlug(orgSlug);
  const members = await getOrgMembersForPicker(org.id);
  const data = await withOrgTx(org.id, async ({ db }) => {
    const me = await db.user.findUnique({ where: { id: user.id }, select: { timezone: true } });
    const todayKey = localDateKey(new Date(), effectiveTimezone(me, org));
    return {
      todayKey,
      epics: await getEpicsOverview(db, org.id, fromDateKey(todayKey)),
      palette: await chartPalette(db, org.id),
    };
  });
  const colors = [...new Set([...data.palette, ...LABEL_COLOR_PALETTE.slice(4)])];
  const key = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

  return (
    <div className="space-y-6">
      <BackLink href={`/app/${org.slug}/tasks`} label={sectionLabel(settings?.sidebar, "tasks")} />
      <EpicsView
        org={{ id: org.id, slug: org.slug }}
        viewerId={user.id}
        todayKey={data.todayKey}
        members={members}
        colors={colors}
        epics={data.epics.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          color: e.color,
          status: e.status,
          ownerId: e.ownerId,
          owner: e.owner,
          startDate: key(e.startDate),
          dueDate: key(e.dueDate),
          stories: e.stories,
          open: e.open,
          done: e.done,
          overdue: e.overdue,
        }))}
      />
    </div>
  );
}
