import { isHex } from "@/lib/theme/hex";

const SLOTS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"];

/**
 * A project's colour as CSS: its own (strict hex, picked when it was made or
 * recoloured), else a chart slot that stays the same for that project.
 * No project at all is the muted ink.
 */
export function projectColor(
  project: { id: string; color?: string | null } | string | null | undefined,
): string {
  if (!project) return "var(--muted-foreground)";
  const id = typeof project === "string" ? project : project.id;
  const own = typeof project === "string" ? null : project.color;
  if (own && isHex(own)) return own;
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `var(${SLOTS[h % SLOTS.length]})`;
}
