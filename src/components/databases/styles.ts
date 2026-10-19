import type { ChoiceColor } from "@/lib/databases/fields";

/**
 * Shared Moonstone classes for the Databases area: the native select (40px,
 * like every other control), the file picker, the notices, and the colours
 * a value chip takes (theme tokens only, so a club theme restyles them).
 */

/** A native <select>, lined up with Input and the Select trigger (40px, field corners). */
export const nativeSelectClass =
  "border-input bg-card text-foreground rounded-field h-10 w-full min-w-0 border px-3 text-sm outline-none transition-colors focus-visible:border-foreground focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--glow)_45%,transparent)] disabled:cursor-not-allowed disabled:opacity-50";

/** A native file <input>: its button is an outline pill. */
export const fileInputClass =
  "text-muted-foreground w-full min-w-0 text-sm file:border-input file:text-foreground hover:file:bg-muted file:mr-3 file:h-10 file:cursor-pointer file:rounded-full file:border file:bg-transparent file:px-4 file:text-sm file:font-semibold file:transition-colors";

export const notice = {
  error: "bg-tint-danger text-tint-danger-foreground rounded-tile p-3 text-sm",
  info: "bg-tint-info text-tint-info-foreground rounded-tile p-3 text-sm",
  success: "bg-tint-success text-tint-success-foreground rounded-tile p-3 text-sm",
  neutral: "bg-muted/60 rounded-tile p-3 text-sm",
} as const;

const CHART_SLOTS = 5;

/**
 * A stable chart colour for a categorical value ("QR", "Engineering"): the
 * same word gets the same slot everywhere, on every page.
 */
export function chartColor(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return `var(--chart-${(Math.abs(hash) % CHART_SLOTS) + 1})`;
}

/**
 * A choice's colour as a theme token, for <TagChip color>. The ten stored
 * names map onto the chart slots and the status colours (mixed where the
 * theme has no slot of its own), so choices follow the club's theme.
 */
const CHOICE_TOKEN: Record<ChoiceColor, string> = {
  gray: "var(--muted-foreground)",
  yellow: "var(--chart-1)",
  orange: "var(--warning)",
  red: "var(--destructive)",
  pink: "color-mix(in oklab, var(--destructive) 55%, var(--chart-4))",
  purple: "var(--chart-4)",
  blue: "var(--chart-2)",
  teal: "color-mix(in oklab, var(--chart-2) 50%, var(--chart-5))",
  green: "var(--chart-5)",
  brown: "var(--chart-3)",
};

export function choiceColor(color: ChoiceColor): string {
  return CHOICE_TOKEN[color] ?? CHOICE_TOKEN.gray;
}
