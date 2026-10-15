import { spaceIncludes, type SpaceInfo } from "@/lib/billing/space";
import { SECTION_FEATURES, type ResolvedGroup } from "@/lib/nav/sidebar";

/**
 * The sidebar's links for one space: a club's sections (in the club's
 * order, under its headings, with its names; Admin panel > Sidebar) as
 * plain data the client sidebar can take, or a Personal space's fixed few.
 * The Admin panel lives in the club menu instead.
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
  /** Not on the club's plan: the link opens the upgrade screen. */
  locked?: boolean;
}

export interface NavSection {
  id: string;
  label: string | null;
  items: NavLink[];
}

/**
 * A Personal space's sidebar: Home (the Personal dashboard), Tasks,
 * Calendar, Find a time (availability polls anyone answers from a link) and
 * RSVPs (its event pages and your tickets). No question polls: only members
 * vote on those, and Personal has one. Not arrangeable: there is no team to
 * arrange it for.
 */
export const PERSONAL_NAV: readonly {
  id: string;
  label: string;
  icon: string;
  /** Path under /app/{slug}. */
  path: string;
  exact: boolean;
}[] = [
  { id: "home", label: "Home", icon: "House", path: "", exact: true },
  { id: "tasks", label: "Tasks", icon: "CheckSquare", path: "/tasks", exact: false },
  { id: "calendar", label: "Calendar", icon: "CalendarDays", path: "/calendar", exact: false },
  {
    id: "find-a-time",
    label: "Find a time",
    icon: "CalendarClock",
    path: "/calendar/find-a-time",
    exact: false,
  },
  { id: "rsvps", label: "RSVPs", icon: "Ticket", path: "/calendar/rsvp", exact: false },
];

/**
 * With a `space`, sections it lacks are left out, or (`showLocked`, for the
 * owner and admins, who can switch plans) kept and marked locked. The
 * Overview is always left out when the space lacks it. A Personal space
 * gets PERSONAL_NAV whatever `groups` says.
 */
export function navSections(
  orgSlug: string,
  groups: readonly ResolvedGroup[],
  options: { space?: SpaceInfo; showLocked?: boolean } = {},
): NavSection[] {
  const { space, showLocked = false } = options;
  if (space?.kind === "PERSONAL") {
    return [
      {
        id: "personal",
        label: null,
        items: PERSONAL_NAV.map((i) => ({
          id: i.id,
          label: i.label,
          href: `/app/${orgSlug}${i.path}`,
          icon: i.icon,
          also: [],
          exact: i.exact,
        })),
      },
    ];
  }
  return groups
    .map((g) => ({
      id: g.id,
      label: g.label,
      items: g.items.flatMap((i): NavLink[] => {
        const locked = space ? !spaceIncludes(space, SECTION_FEATURES[i.id]) : false;
        if (locked && (!showLocked || i.id === "overview")) return [];
        return [
          {
            id: i.id,
            label: i.label,
            href: `/app/${orgSlug}${i.path}`,
            icon: i.icon,
            also: i.also.map((p) => `/app/${orgSlug}${p}`),
            exact: i.exact,
            ...(locked ? { locked: true } : {}),
          },
        ];
      }),
    }))
    .filter((g) => g.items.length > 0);
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
