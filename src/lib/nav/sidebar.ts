import { z } from "zod";

import type { PlanFeature } from "@/lib/billing/features";

/**
 * The org's sidebar (OrgSettings.sidebar): which sections show, in what
 * order, under which heading, and what they're called. Owners and admins
 * edit it in Settings › Sidebar; NULL is the default below. Overview and
 * Settings always stay. Hiding a section tidies the app; it is not a
 * permission (the data rules don't change), and admins can still open it.
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
const RETIRED_SECTION_IDS = ["org-chart"] as const;

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
  { id: "overview", label: "Overview", icon: "LayoutDashboard", path: "", exact: true, group: "main", locked: true, description: "Each member's home page." },
  { id: "tasks", label: "Tasks", icon: "CheckSquare", path: "/tasks", group: "main", description: "Who's doing what, and by when." },
  { id: "calendar", label: "Calendar", icon: "CalendarDays", path: "/calendar", group: "main", description: "Meetings and events." },
  { id: "notes", label: "Files", icon: "FolderOpen", path: "/notes", group: "main", description: "Notes, documents and uploads." },
  { id: "people", label: "People", icon: "Users", path: "/people", also: ["/org-chart"], group: "club", description: "The member directory and the org chart." },
  { id: "polls", label: "Polls", icon: "CalendarCheck", path: "/calendar/polls", group: "club", description: "Ask the club anything, or find a time that works." },
  { id: "databases", label: "Databases", icon: "Database", path: "/databases", group: "data", description: "Attendance, sign-ups, votes and reports." },
  { id: "finance", label: "Finance", icon: "Wallet", path: "/finance", group: "data", description: "Budget, transactions and reimbursements." },
];

/** The plan feature behind each section (src/lib/billing/features.ts). */
export const SECTION_FEATURES: Record<SectionId, PlanFeature> = {
  overview: "overview",
  tasks: "tasks",
  calendar: "rsvp",
  notes: "files",
  people: "people",
  polls: "polls",
  databases: "databases",
  finance: "finance",
};

export const DEFAULT_GROUP_LABELS: Record<GroupId, string | null> = { main: null, club: "Club", data: "Data" };

const label = z
  .string()
  .transform((s) => s.replace(/\s+/g, " ").trim())
  .pipe(z.string().max(24, "Keep names under 24 characters."))
  .transform((s) => s || null)
  .nullable();

export const sidebarConfigSchema = z
  .object({
    groups: z.array(z.object({ id: z.enum(GROUP_IDS), label }).strict()).max(GROUP_IDS.length),
    items: z
      .array(
        z
          .object({
            id: z.enum([...SECTION_IDS, ...RETIRED_SECTION_IDS]),
            group: z.enum(GROUP_IDS),
            hidden: z.boolean(),
            label,
          })
          .strict(),
      )
      .max(SECTION_IDS.length + RETIRED_SECTION_IDS.length),
  })
  .strict();

export type SidebarConfig = z.output<typeof sidebarConfigSchema>;

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

/** The full sidebar (hidden sections included, flagged), in the org's order. */
export function resolveSidebar(raw: unknown): ResolvedGroup[] {
  const parsed = raw ? sidebarConfigSchema.safeParse(raw) : null;
  const config = parsed?.success ? parsed.data : null;
  const groupLabel = new Map(config?.groups.map((g) => [g.id, g.label]) ?? []);
  const saved = new Map<string, NonNullable<typeof config>["items"][number] & { index: number }>(
    config?.items.map((i, index) => [i.id, { ...i, index }]) ?? [],
  );
  const items: (ResolvedItem & { order: number })[] = SECTIONS.map((def, i) => {
    const s = saved.get(def.id);
    return {
      id: def.id,
      label: s?.label ?? def.label,
      defaultLabel: def.label,
      icon: def.icon,
      path: def.path,
      also: def.also ?? [],
      exact: def.exact ?? false,
      hidden: def.locked ? false : (s?.hidden ?? false),
      locked: def.locked ?? false,
      group: def.locked ? "main" : (s?.group ?? def.group),
      description: def.description,
      // Saved order first; sections added since keep their default place after.
      order: s ? s.index : 100 + i,
    };
  });
  // Overview always leads.
  items.sort((a, b) => (a.id === "overview" ? -1 : b.id === "overview" ? 1 : a.order - b.order));
  return GROUP_IDS.map((id) => ({
    id,
    label: groupLabel.has(id) ? (groupLabel.get(id) ?? null) : DEFAULT_GROUP_LABELS[id],
    items: items.filter((i) => i.group === id).map(({ order: _o, ...rest }) => rest),
  }));
}

/** What the sidebar shows: hidden sections and empty groups left out. */
export function visibleSidebar(raw: unknown): ResolvedGroup[] {
  return resolveSidebar(raw)
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.hidden) }))
    .filter((g) => g.items.length > 0);
}

export function hiddenSectionPaths(raw: unknown): string[] {
  return resolveSidebar(raw)
    .flatMap((g) => g.items)
    .filter((i) => i.hidden)
    .flatMap((i) => [i.path, ...i.also]);
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
