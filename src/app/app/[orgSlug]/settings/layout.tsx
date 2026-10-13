import { getOrgContextBySlug } from "@/server/db/context";

import { settingsNavItems } from "./settings-nav";
import { SettingsSubnav } from "./settings-subnav";

/**
 * The Settings shell: a grouped rail of every settings page the viewer's
 * role may open, beside the page (a chip strip on a phone). Each page still
 * checks its own permission on the server.
 */
export default async function SettingsLayout({
  params,
  children,
}: LayoutProps<"/app/[orgSlug]/settings">) {
  const { orgSlug } = await params;
  const { role } = await getOrgContextBySlug(orgSlug);

  return (
    // minmax(0, 1fr) on a phone too: the tab strip scrolls inside its column
    // instead of stretching the page to its full width.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
      <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <SettingsSubnav items={settingsNavItems(orgSlug, role)} orgSlug={orgSlug} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
