"use client";

import { useEffect, useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The chart kit (Moonstone, guide section 8): a few chart forms, each with
 * one job, shared by Reports and the Finance dashboard.
 *
 * - Colours come ONLY from the theme's chart slots (--chart-1..5), in fixed
 *   order, so a theme change restyles every chart. Text wears text tokens.
 * - Gridlines are faint dotted hairlines; a reference (an average, a
 *   starting point) is a dashed line in the text colour.
 * - "Not yet" (pending, awaiting) is a hatch of the series colour, never a
 *   sixth colour.
 * - Lines and bars draw in once, the first time they render (800ms), and
 *   not at all under prefers-reduced-motion.
 *
 * The forms: TrendChart (line and area, ./trend-chart), BarsChart (columns,
 * with a hatched top, ./bars-chart), Donut (below), and the meters in
 * src/components/ui/meters (TickMeter, Gauge, MixBar).
 */

export const SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** The slot for the i-th category, cycling only past five (charts keep it to five). */
export const seriesColor = (i: number) => SERIES[i % SERIES.length];

export const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12, fontWeight: 500 };

export const axisProps = {
  tick: AXIS_TICK,
  axisLine: false,
  tickLine: false,
} as const;

export const gridProps = {
  stroke: "var(--border)",
  strokeWidth: 1,
  strokeDasharray: "2 5",
  vertical: false,
} as const;

/** The dashed reference line (an average, where the period started). */
export const referenceProps = {
  stroke: "var(--foreground)",
  strokeOpacity: 0.7,
  strokeWidth: 1.5,
  strokeDasharray: "6 5",
  ifOverflow: "extendDomain",
} as const;

/** The surface colour: the ring around markers and gaps between touching fills. */
export const SURFACE = "var(--card)";

/** The hover cursor over a column. */
export const barCursor = { fill: "var(--muted)", opacity: 0.55, radius: 12 } as const;

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(reducedMotionQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** True when the member asked for less motion (and on the server, so nothing animates there). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => (window.matchMedia ? window.matchMedia(reducedMotionQuery).matches : false),
    () => true,
  );
}

/** Recharts animation props: draw in over 800ms, or not at all under reduced motion. */
export function useChartAnimation() {
  const reduce = useReducedMotion();
  return {
    isAnimationActive: !reduce,
    animationDuration: 800,
    animationEasing: "ease-out" as const,
  };
}

/** The hatch for a "not yet" fill: stripes of the series colour on its own soft tint. */
export function HatchPattern({ id, color = "var(--chart-1)" }: { id: string; color?: string }) {
  return (
    <pattern
      id={id}
      width="7"
      height="7"
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(45)"
    >
      <rect
        width="7"
        height="7"
        style={{ fill: `color-mix(in oklab, ${color} 22%, var(--card))` }}
      />
      <rect width="2.5" height="7" style={{ fill: color }} />
    </pattern>
  );
}

/** A soft vertical wash under a line, in the series colour. */
export function AreaGradient({ id, color = "var(--chart-1)" }: { id: string; color?: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.24 }} />
      <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
    </linearGradient>
  );
}

export interface LegendEntry {
  label: ReactNode;
  color?: string;
  /** dot: a series; dash: a reference line; hatch: "not yet"; rect: a part of a whole. */
  shape?: "dot" | "dash" | "hatch" | "rect" | "line";
}

/** A legend row above the plot (always present for two or more series, or a reference). */
export function ChartLegend({
  entries,
  className,
}: {
  entries: LegendEntry[];
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "text-muted-foreground flex flex-wrap gap-x-4.5 gap-y-1.5 text-[13px]",
        className,
      )}
      aria-label="Legend"
    >
      {entries.map((e, i) => (
        <li key={i} className="flex items-center gap-[7px]">
          <LegendSwatch shape={e.shape ?? "dot"} color={e.color ?? SERIES[0]} />
          {e.label}
        </li>
      ))}
    </ul>
  );
}

export function LegendSwatch({
  shape,
  color,
}: {
  shape: NonNullable<LegendEntry["shape"]>;
  color: string;
}) {
  const style = { "--sw": color } as CSSProperties;
  switch (shape) {
    case "dash":
      return (
        <span
          aria-hidden="true"
          className="border-foreground inline-block w-4 border-t-2 border-dashed opacity-70"
        />
      );
    case "hatch":
      return (
        <span
          aria-hidden="true"
          style={style}
          className="inline-block size-3 rounded-[3px] bg-[repeating-linear-gradient(-45deg,var(--sw)_0_2px,transparent_2px_4.5px)]"
        />
      );
    case "rect":
      return (
        <span
          aria-hidden="true"
          style={style}
          className="inline-block size-2.5 rounded-[3px] bg-(--sw)"
        />
      );
    case "line":
      return (
        <span
          aria-hidden="true"
          style={style}
          className="inline-block h-0.5 w-3.5 rounded-full bg-(--sw)"
        />
      );
    default:
      return (
        <span
          aria-hidden="true"
          style={style}
          className="inline-block size-[9px] rounded-full bg-(--sw)"
        />
      );
  }
}

export interface TooltipRow {
  label: string;
  value: ReactNode;
  color?: string;
  shape?: LegendEntry["shape"];
}

/** Tooltip body (a level-2 float): a bold heading, then one row per series, value on the right. */
export function TooltipCard({
  heading,
  sub,
  rows,
}: {
  heading: ReactNode;
  sub?: ReactNode;
  rows: TooltipRow[];
}) {
  return (
    <div className="bg-raised text-popover-foreground ring-foreground/8 shadow-e2 min-w-40 rounded-[14px] px-3 py-2.5 text-[13px] ring-1">
      <div className="font-bold">{heading}</div>
      {sub ? <div className="text-muted-foreground text-xs">{sub}</div> : null}
      <ul className="mt-1.5 flex flex-col gap-[3px]">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground inline-flex items-center gap-[7px]">
              {r.color || r.shape === "dash" ? (
                <LegendSwatch shape={r.shape ?? "dot"} color={r.color ?? SERIES[0]} />
              ) : null}
              {r.label}
            </span>
            <span className="font-bold tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Placeholder with the chart's exact footprint, so lazy loading never shifts the layout. */
export function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      className="bg-muted/50 rounded-tile w-full animate-pulse"
      style={{ height }}
      aria-hidden="true"
    />
  );
}

export interface DonutPart {
  label: string;
  value: number;
  /** A chart slot ("var(--chart-2)"); defaults to the part's place in the order. */
  color?: string;
  /** What the legend shows for it ("$1,200", "14"); defaults to the value. */
  display?: ReactNode;
}

/**
 * How a whole splits into up to five parts: a ring of rounded segments with
 * gaps between them, the total in the middle, and a legend beside it.
 * Segments draw in once, the first time the ring is seen.
 */
export function Donut({
  parts,
  label,
  center,
  centerLabel,
  size = 150,
  legend = true,
  className,
}: {
  parts: readonly DonutPart[];
  /** For screen readers: "32 members: 14 build team, 9 outreach...". */
  label: string;
  /** The figure in the middle ("32", "$3.2K"). */
  center?: ReactNode;
  centerLabel?: ReactNode;
  size?: number;
  legend?: boolean;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const reduce = useReducedMotion();
  const colored = parts.map((p, i) => ({ ...p, color: p.color ?? seriesColor(i) }));
  const shown = colored.filter((p) => p.value > 0);
  const total = shown.reduce((sum, p) => sum + p.value, 0);
  const gap = shown.length > 1 ? 7 : 0;

  const lengths = shown.map((p) => (total > 0 ? (p.value / total) * 100 : 0));
  const segments = shown.map((p, i) => {
    const start = lengths.slice(0, i).reduce((sum, len) => sum + len, 0);
    return {
      key: `${p.label}-${i}`,
      color: p.color,
      dash: Math.max(lengths[i] - gap, 0.5),
      offset: -(start + gap / 2),
    };
  });

  useEffect(() => {
    const svg = ref.current;
    if (!svg || reduce || typeof IntersectionObserver === "undefined") return;
    const circles = [...svg.querySelectorAll<SVGCircleElement>("circle[data-seg]")];
    if (circles.length === 0 || !circles[0].animate) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        circles.forEach((c, i) => {
          const to = c.style.strokeDasharray;
          c.animate([{ strokeDasharray: "0 100" }, { strokeDasharray: to }], {
            duration: 800,
            delay: i * 60,
            easing: "cubic-bezier(0.2, 0.75, 0.15, 1)",
            fill: "backwards",
          });
        });
      },
      { threshold: 0.4 },
    );
    observer.observe(svg);
    return () => observer.disconnect();
  }, [reduce, total]);

  return (
    <div className={cn("flex flex-wrap items-center gap-6", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg ref={ref} viewBox="0 0 120 120" role="img" aria-label={label} className="size-full">
          <circle
            cx="60"
            cy="60"
            r="48"
            className="stroke-muted fill-none"
            strokeWidth={12}
            opacity={total > 0 ? 0 : 1}
          />
          <g transform="rotate(-90 60 60)">
            {segments.map((s) => (
              <circle
                key={s.key}
                data-seg=""
                cx="60"
                cy="60"
                r="48"
                pathLength={100}
                fill="none"
                strokeWidth={12}
                strokeLinecap="round"
                style={{
                  stroke: s.color,
                  strokeDasharray: `${s.dash.toFixed(2)} 100`,
                  strokeDashoffset: s.offset.toFixed(2),
                }}
              />
            ))}
          </g>
        </svg>
        {center !== undefined && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <b className="numeral text-[26px]">{center}</b>
            {centerLabel && (
              <span className="text-muted-foreground mt-1 text-xs">{centerLabel}</span>
            )}
          </div>
        )}
      </div>
      {legend && (
        <ul className="flex min-w-0 flex-1 flex-col gap-2 text-[13px]">
          {colored.map((p, i) => (
            <li key={`${p.label}-${i}`} className="flex min-w-0 items-center gap-2">
              <LegendSwatch shape="rect" color={p.color} />
              <span className="min-w-0 flex-1 truncate">{p.label}</span>
              <b className="font-semibold tabular-nums">{p.display ?? p.value}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
