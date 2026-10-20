import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The chart kit's meters (Moonstone, section 8 of the redesign guide). All
 * colours are theme tokens; "not yet" is a hatch, never a sixth colour.
 */

/**
 * Progress toward a fixed amount, one tick per real unit (a member, a seat,
 * $125). Filled ticks take `color` (a chart slot by default).
 */
export function TickMeter({
  total,
  filled,
  label,
  color = "var(--chart-2)",
  height = 26,
  className,
}: {
  total: number;
  filled: number;
  /** What the meter says, for screen readers: "8 of 14 voted". */
  label: string;
  color?: string;
  height?: number;
  className?: string;
}) {
  const ticks = Math.max(1, Math.min(total, 60));
  const on = Math.round((Math.min(filled, total) / Math.max(total, 1)) * ticks);
  return (
    <div
      role="img"
      aria-label={label}
      style={{ height, "--tick": color } as CSSProperties}
      className={cn("flex gap-[3px]", className)}
    >
      {Array.from({ length: ticks }, (_, i) => (
        <i
          key={i}
          className={cn(
            "min-w-0.5 flex-1 rounded-[3px]",
            i < on ? "bg-(--tick)" : "bg-muted-strong",
          )}
        />
      ))}
    </div>
  );
}

/** One number against a goal: a 270° arc in the glow colour, the value in the middle. */
export function Gauge({
  value,
  caption = "full",
  size = 132,
  className,
}: {
  /** 0-100. */
  value: number;
  caption?: ReactNode;
  size?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" role="img" aria-label={`${pct} percent`} className="size-full">
        <path
          d="M23.2 96.8 A52 52 0 1 1 96.8 96.8"
          pathLength={100}
          className="fill-none stroke-current opacity-20"
          strokeWidth={10}
          strokeLinecap="round"
        />
        <path
          d="M23.2 96.8 A52 52 0 1 1 96.8 96.8"
          pathLength={100}
          className="stroke-glow fill-none drop-shadow-[0_0_5px_color-mix(in_oklab,var(--glow)_55%,transparent)]"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${pct} 100`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
        <b className="numeral text-[32px]">{pct}%</b>
        <span className="text-[12px] font-medium opacity-80">{caption}</span>
      </div>
    </div>
  );
}

export interface MixSegment {
  label: string;
  value: number;
  /** A theme token ("var(--chart-2)"); omit with `hatch` for "not yet". */
  color?: string;
  hatch?: boolean;
}

/** How a whole splits into parts, to scale, in a fixed order, with a legend. */
export function MixBar({
  segments,
  label,
  height = 44,
  legend = true,
  className,
}: {
  segments: readonly MixSegment[];
  /** For screen readers: "12 not started, 9 in progress...". */
  label: string;
  height?: number;
  legend?: boolean;
  className?: string;
}) {
  const visible = segments.filter((s) => s.value > 0);
  return (
    <div className={className}>
      <div role="img" aria-label={label} className="flex gap-1.5" style={{ height }}>
        {visible.map((s) => (
          <i
            key={s.label}
            style={{ flexGrow: s.value, background: s.hatch ? undefined : s.color }}
            className={cn(
              "min-w-1.5 basis-0 rounded-[14px]",
              s.hatch && "bg-muted hatch",
              height <= 20 && "rounded-full",
            )}
          />
        ))}
      </div>
      {legend && (
        <div className="mt-3 flex flex-wrap gap-x-4.5 gap-y-2 text-[13px]">
          {segments.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                style={{ background: s.hatch ? undefined : s.color }}
                className={cn("size-2.5 rounded-[3px]", s.hatch && "bg-muted-strong")}
              />
              {s.label} <b className="font-semibold tabular-nums">{s.value}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
