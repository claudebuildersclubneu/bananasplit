import "server-only";

import { z } from "zod";

import {
  DEFAULT_GROUP_LABELS,
  GROUP_IDS,
  RETIRED_SECTION_IDS,
  SECTION_IDS,
  SECTIONS,
  type ResolvedGroup,
  type ResolvedItem,
  type SidebarConfig,
} from "./sections";

/**
 * The org's sidebar (OrgSettings.sidebar): which sections show, in what
 * order, under which heading, and what they're called. Owners and admins
 * edit it in Settings › Sidebar; NULL is the default below. Overview and
 * Settings always stay. Hiding a section tidies the app; it is not a
 * permission (the data rules don't change), and admins can still open it.
 *
 * This module reads and checks saved configs with zod, so it is server only.
 * The sections, shapes and toConfig are zod-free in ./sections (the sidebar
 * editor uses them in the browser) and re-exported here.
 */

export * from "./sections";

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
  .strict() satisfies z.ZodType<SidebarConfig, unknown>;

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
