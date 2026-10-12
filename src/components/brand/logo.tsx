import { cn } from "@/lib/utils";

/*
 * "The Core": a banana cut across, on a 120-unit grid. A ring of peel, the
 * cream flesh, and three seeds a third of a turn apart.
 */
const SEED = { cx: 60, cy: 44, rx: 5, ry: 11 } as const;

const INKS = {
  /** The logo: banana peel, cream flesh, golden seeds. */
  default: { ring: "fill-slice stroke-banana", seeds: "fill-core" },
  /** On the yellow auth panel: drawn in ink on cream. */
  ink: { ring: "fill-slice stroke-ink", seeds: "fill-ink" },
  /** The large faint watermark: a cream outline. */
  outline: { ring: "fill-none stroke-paper", seeds: "fill-paper" },
} as const;

/** The mark alone. Decorative: pair it with the name. */
export function CoreMark({
  size = 28,
  tone = "default",
  className,
}: {
  size?: number;
  tone?: keyof typeof INKS;
  className?: string;
}) {
  const ink = INKS[tone];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <circle cx="60" cy="60" r="40" strokeWidth="12" className={ink.ring} />
      <g className={ink.seeds}>
        <ellipse {...SEED} />
        <ellipse {...SEED} transform="rotate(120 60 60)" />
        <ellipse {...SEED} transform="rotate(240 60 60)" />
      </g>
    </svg>
  );
}

/** The mark and the lowercase "bananasplit" in Young Serif, 10px apart. */
export function Logo({
  size = 28,
  textSize = 20,
  tone = "default",
  className,
  wordmarkClassName,
}: {
  size?: number;
  textSize?: number;
  tone?: keyof typeof INKS;
  className?: string;
  /** e.g. hiding the name on the narrowest screens. */
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <CoreMark size={size} tone={tone} />
      <span
        className={cn("font-display tracking-[-0.01em]", wordmarkClassName)}
        style={{ fontSize: textSize }}
      >
        bananasplit
      </span>
    </span>
  );
}
