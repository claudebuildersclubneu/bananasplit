import { normalizeHex } from "@/lib/theme/hex";
import { resolveTheme } from "@/lib/theme/resolve";
import type { TxClient } from "@/server/db/context";

/**
 * Colours for things members make on the spot (tags, projects): the club's
 * own chart slots, in order, as hex, so a new tag or project picks up the
 * theme's next colour. The stored value is plain hex (a tag keeps its colour
 * if the theme changes later); the chart slots come from the club's theme
 * in the mode it opens in (dark unless it is set to light).
 */
export async function chartPalette(db: TxClient, organizationId: string): Promise<string[]> {
  const row = await db.orgTheme.findUnique({ where: { organizationId } });
  const theme = resolveTheme(row);
  const tokens = theme.mode === "LIGHT" ? theme.tokens.light : theme.tokens.dark;
  const slots = [1, 2, 3, 4, 5].map((i) =>
    normalizeHex(tokens[`chart-${i}` as keyof typeof tokens]),
  );
  return slots.filter((c): c is string => c !== null);
}

/** The first slot nobody uses yet, else the next one round the wheel. */
export function nextColor(palette: readonly string[], used: readonly (string | null)[]): string {
  if (palette.length === 0) return "#888888";
  const taken = new Set(used.filter(Boolean).map((c) => c!.toLowerCase()));
  return palette.find((c) => !taken.has(c)) ?? palette[used.length % palette.length]!;
}
