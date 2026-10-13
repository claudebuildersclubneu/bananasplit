import type { ResolvedGroup } from "@/lib/nav/sections";

/**
 * The sidebar's links for one org: its sections (in the org's order, under
 * its headings, with its names; Admin panel › Sidebar) as plain data the
 * client sidebar can take. The Admin panel lives in the club menu instead.
 */

export interface NavLink {
  id: string;
  label: string;
  href: string;
  /** lucide icon name. */
  icon: string;
  /** Other pages that belong to this link (People's org chart). */
  also?: string[];
  /**
   * Active only on its own URL (Overview, whose URL is a prefix of every
   * other link's); otherwise also on the pages below it.
   */
  exact: boolean;
}

export interface NavSection {
  id: string;
  label: string | null;
  items: NavLink[];
}

export function navSections(orgSlug: string, groups: readonly ResolvedGroup[]): NavSection[] {
  return groups.map((g) => ({
    id: g.id,
    label: g.label,
    items: g.items.map((i) => ({
      id: i.id,
      label: i.label,
      href: `/app/${orgSlug}${i.path}`,
      icon: i.icon,
      also: i.also.map((p) => `/app/${orgSlug}${p}`),
      exact: i.exact,
    })),
  }));
}

function matchesHref(href: string, exact: boolean, pathname: string): boolean {
  if (pathname === href) return true;
  if (exact) return false;
  return pathname.startsWith(`${href}/`);
}

/** The length of the most specific href of `link` that `pathname` is on, or 0. */
function matchLength(link: NavLink, pathname: string): number {
  const hrefs = [link.href, ...(link.also ?? [])].filter((h) =>
    matchesHref(h, link.exact, pathname),
  );
  return Math.max(0, ...hrefs.map((h) => h.length));
}

/**
 * Whether `link` is the active one on `pathname`. When links nest (Polls
 * lives under Calendar), only the most specific match is active.
 */
export function isLinkActive(link: NavLink, pathname: string, all: readonly NavLink[]): boolean {
  const mine = matchLength(link, pathname);
  if (mine === 0) return false;
  return !all.some((other) => matchLength(other, pathname) > mine);
}
