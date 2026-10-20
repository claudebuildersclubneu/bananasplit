import { BackLink } from "@/components/back-link";
import { can } from "@/lib/auth/permissions";
import { LABEL_COLOR_PALETTE } from "@/lib/label-colors";
import { sectionLabel } from "@/lib/nav/sidebar";
import { creationRights } from "@/lib/tasks/projects";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { getOrgMembersForPicker } from "@/server/members";
import { chartPalette } from "@/server/tasks/catalog";
import { getProjectsOverview } from "@/server/tasks/queries";

import { ProjectsView } from "./projects-view";

/**
 * Tasks > Projects: the club's projects with their colour, lead, status,
 * dates and how much of their work is done. A project's own view is the
 * workspace filtered to it (?project=). Creating and editing follow the
 * club's "Who can create projects" switch; archiving is for owners, admins
 * and the project's lead (src/lib/tasks/projects.ts).
 */
export default async function ProjectsPage({ params }: PageProps<"/app/[orgSlug]/tasks/projects">) {
  const { orgSlug } = await params;
  const { organization: org, user, role, settings } = await getOrgContextBySlug(orgSlug);
  const isAdmin = can({ role }, "tasks.manageAll");
  const members = await getOrgMembersForPicker(org.id);
  const data = await withOrgTx(org.id, async ({ db }) => ({
    projects: await getProjectsOverview(db, org.id),
    palette: await chartPalette(db, org.id),
  }));
  const colors = [...new Set([...data.palette, ...LABEL_COLOR_PALETTE.slice(4)])];

  return (
    <div className="space-y-6">
      <BackLink href={`/app/${org.slug}/tasks`} label={sectionLabel(settings?.sidebar, "tasks")} />
      <ProjectsView
        org={{ id: org.id, slug: org.slug }}
        viewer={{
          userId: user.id,
          isAdmin,
          membersCanCreate: creationRights(false, settings).createProjects,
        }}
        members={members}
        colors={colors}
        projects={data.projects.map((p) => ({
          ...p,
          startDate: p.startDate ? p.startDate.toISOString().slice(0, 10) : null,
          targetDate: p.targetDate ? p.targetDate.toISOString().slice(0, 10) : null,
          archivedAt: p.archivedAt ? p.archivedAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
