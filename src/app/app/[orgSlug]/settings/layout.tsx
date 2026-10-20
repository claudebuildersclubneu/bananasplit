import { getOrgContextBySlug } from "@/server/db/context";

import { settingsNavItems } from "./settings-nav";
import { SettingsSubnav } from "./settings-subnav";

/**
 * The Settings shell: a grouped list (in a card) of every settings page the
 * viewer's role may open, beside the page's form cards (a scrolling strip
 * of pills on a phone). Each page still checks its own permission on the
 * server.
 */
export default async function SettingsLayout({
  params,
  children,
}: LayoutProps<"/app/[orgSlug]/settings">) {
  const { orgSlug } = await params;
  const { role, organization } = await getOrgContextBySlug(orgSlug);

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-7.5">
      <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <SettingsSubnav
          items={settingsNavItems(orgSlug, role, organization)}
          orgSlug={orgSlug}
          personal={organization.kind === "PERSONAL"}
        />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
