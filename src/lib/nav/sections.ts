/**
 * The org's sidebar sections and the shapes Settings › Sidebar edits:
 * everything about the sidebar except reading a saved config, which
 * validates with zod and stays on the server (./sidebar). Zod-free, so the
 * sidebar editor never ships zod to the browser.
 */

export const SECTION_IDS = [
  "overview",
  "tasks",
  "calendar",
  "notes",
  "people",
  "polls",
  "databases",
  "finance",
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

/**
 * Sections that used to be separate and still appear in saved sidebars:
 * accepted when reading a saved config, then dropped. The org chart is part
 * of People now.
 */
export const RETIRED_SECTION_IDS = ["org-chart"] as const;
export type RetiredSectionId = (typeof RETIRED_SECTION_IDS)[number];

export const GROUP_IDS = ["main", "club", "data"] as const;
export type GroupId = (typeof GROUP_IDS)[number];

export interface SectionDef {
  id: SectionId;
  label: string;
  /** lucide icon name, resolved in the sidebar. */
  icon: string;
  /** Path under /app/{slug}. */
  path: string;
  /** Other paths (under /app/{slug}) that belong to this section. */
  also?: string[];
  exact?: boolean;
  group: GroupId;
  /** Can't be hidden. */
  locked?: boolean;
  description: string;
}

export const SECTIONS: readonly SectionDef[] = [
  {
    id: "overview",
    label: "Overview",
    icon: "LayoutDashboard",
    path: "",
    exact: true,
    group: "main",
    locked: true,
    description: "Each member's home page.",
  },
  {
    id: "tasks",
    label: "Tasks",
    icon: "CheckSquare",
    path: "/tasks",
    group: "main",
    description: "Who's doing what, and by when.",
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: "CalendarDays",
    path: "/calendar",
    group: "main",
    description: "Meetings and events.",
  },
  {
    id: "notes",
    label: "Files",
    icon: "FolderOpen",
    path: "/notes",
    group: "main",
    description: "Notes, documents and uploads.",
  },
  {
    id: "people",
    label: "People",
    icon: "Users",
    path: "/people",
    also: ["/org-chart"],
    group: "club",
    description: "The member directory and the org chart.",
  },
  {
    id: "polls",
    label: "Polls",
    icon: "CalendarCheck",
    path: "/calendar/polls",
    group: "club",
    description: "Ask the club anything, or find a time that works.",
  },
  {
    id: "databases",
    label: "Databases",
    icon: "Database",
    path: "/databases",
    group: "data",
    description: "Attendance, sign-ups, votes and reports.",
  },
  {
    id: "finance",
    label: "Finance",
    icon: "Wallet",
    path: "/finance",
    group: "data",
    description: "Budget, transactions and reimbursements.",
  },
];

export const DEFAULT_GROUP_LABELS: Record<GroupId, string | null> = {
  main: null,
  club: "Club",
  data: "Data",
};

/** A saved sidebar (OrgSettings.sidebar), as the server's schema reads it. */
export interface SidebarConfig {
  groups: { id: GroupId; label: string | null }[];
  items: {
    id: SectionId | RetiredSectionId;
    group: GroupId;
    hidden: boolean;
    label: string | null;
  }[];
}

export interface ResolvedItem {
  id: SectionId;
  label: string;
  defaultLabel: string;
  icon: string;
  path: string;
  also: string[];
  exact: boolean;
  hidden: boolean;
  locked: boolean;
  group: GroupId;
  description: string;
}

export interface ResolvedGroup {
  id: GroupId;
  label: string | null;
  items: ResolvedItem[];
}

/** The config that reproduces `groups` (what Settings › Sidebar saves). */
export function toConfig(groups: readonly ResolvedGroup[]): SidebarConfig {
  return {
    groups: groups.map((g) => ({ id: g.id, label: g.label })),
    items: groups.flatMap((g) =>
      g.items.map((i) => ({
        id: i.id,
        group: g.id,
        hidden: i.hidden,
        label: i.label === i.defaultLabel ? null : i.label,
      })),
    ),
  };
}
