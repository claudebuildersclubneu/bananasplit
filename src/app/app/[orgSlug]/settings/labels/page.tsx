import { can } from "@/lib/auth/permissions";
import { LABEL_COLOR_PALETTE } from "@/lib/label-colors";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { planGate } from "@/server/billing/plan-gate";
import { chartPalette } from "@/server/tasks/catalog";

import { SettingsNoAccess } from "../settings-no-access";
import { CreationRules } from "./creation-rules";
import { LabelForm } from "./label-form";
import { TagList } from "./tag-list";

/**
 * Settings > Tags (the route keeps its old /labels path, which other pages
 * link to): who can make tags and projects, and the club's tags, which
 * owners and admins rename, recolour, merge and delete here. Members make
 * tags from any task's tag field while the club lets them.
 */
export default async function TagsPage({ params }: PageProps<"/app/[orgSlug]/settings/labels">) {
  const { orgSlug } = await params;
  const planLock = await planGate(orgSlug, "labels");
  if (planLock) return planLock;
  const { organization, role, settings } = await getOrgContextBySlug(orgSlug);
  if (!can({ role }, "labels.write")) {
    return <SettingsNoAccess title="Tags" who="owners and admins" />;
  }

  const data = await withOrgTx(organization.id, async ({ db }) => {
    const tags = await db.label.findMany({
      where: { organizationId: organization.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
        _count: { select: { tasks: true } },
      },
    });
    return { tags, palette: await chartPalette(db, organization.id) };
  });
  const colors = [...new Set([...data.palette, ...LABEL_COLOR_PALETTE.slice(4)])];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Tags</h1>
        <p className="text-muted-foreground mt-2 text-[15px]">
          Shared by every task in the club. Type one on any task to add it.
        </p>
      </div>

      <CreationRules
        orgId={organization.id}
        memberCanCreateTags={settings?.memberCanCreateTags ?? true}
        memberCanCreateProjects={settings?.memberCanCreateProjects ?? true}
      />

      <section className="space-y-4">
        <h2 className="heading">Tags</h2>
        <LabelForm orgId={organization.id} />
        <TagList
          orgId={organization.id}
          colors={colors}
          tags={data.tags.map((t) => ({
            id: t.id,
            name: t.name,
            color: t.color,
            uses: t._count.tasks,
          }))}
        />
      </section>
    </div>
  );
}
