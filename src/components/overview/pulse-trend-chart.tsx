"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Tasks finished per week against the average (redesign guide 8.1): one
 * area in the theme's first chart slot, a dashed reference line, a guide
 * and tooltip on the focused week (the latest by default). Hover or use
 * the arrow keys to move it. The line draws in the first time it's seen
 * (off under reduced motion). Text stays in the text tokens.
 */

export interface TrendPoint {
  label: string;
  value: number;
}

const L = 34;
const R = 26;
const T = 14;
const B = 30;

/** A monotone cubic through the points (no overshoot between weeks). */
function monotone(pts: [number, number][]): string {
  const n = pts.length;
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const d: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) d[i] = (pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0]);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  let p = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = (pts[i + 1][0] - pts[i][0]) / 3;
    p += ` C${(pts[i][0] + h).toFixed(1)},${(pts[i][1] + m[i] * h).toFixed(1)} ${(pts[i + 1][0] - h).toFixed(1)},${(pts[i + 1][1] - m[i + 1] * h).toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
  }
  return p;
}

function niceMax(v: number): number {
  if (v <= 5) return 5;
  if (v <= 10) return 10;
  const step = v <= 50 ? 10 : 50;
  return Math.ceil(v / step) * step;
}

export function PulseTrendChart({
  points,
  average,
  height = 210,
}: {
  points: readonly TrendPoint[];
  average: number;
  height?: number;
}) {
  const id = `pt${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const host = useRef<HTMLDivElement>(null);
  const line = useRef<SVGPathElement>(null);
  const [width, setWidth] = useState(560);
  const [focus, setFocus] = useState(points.length - 1);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(260, el.clientWidth));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Draw the line in once, when it scrolls into view.
  useEffect(() => {
    const el = line.current;
    if (!el || typeof IntersectionObserver === "undefined" || !el.getTotalLength) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const len = el.getTotalLength();
        el.animate(
          [
            { strokeDasharray: `${len} ${len}`, strokeDashoffset: len },
            { strokeDasharray: `${len} ${len}`, strokeDashoffset: 0 },
          ],
          { duration: 900, easing: "cubic-bezier(.2,.75,.15,1)" },
        );
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const n = points.length;
  if (n === 0) return null;
  const max = niceMax(Math.max(...points.map((p) => p.value), average));
  const ticks = [0, max / 2, max];
  const iw = width - L - R;
  const ih = height - T - B;
  const X = (i: number) => (n === 1 ? L + iw / 2 : L + (iw * i) / (n - 1));
  const Y = (v: number) => T + ih - (ih * v) / max;
  const path = monotone(points.map((p, i) => [X(i), Y(p.value)]));
  const area = `${path} L${X(n - 1).toFixed(1)},${T + ih} L${X(0).toFixed(1)},${T + ih} Z`;
  const step = n > 1 && iw / (n - 1) < 54 ? 2 : 1;
  const f = Math.max(0, Math.min(n - 1, focus));
  const tipX = Math.min(Math.max(X(f), 86), width - 86);
  const tipY = Math.max(Y(points[f].value) - 14, 74);
  const avg = Math.round(average * 10) / 10;

  return (
    <div
      ref={host}
      tabIndex={0}
      role="img"
      aria-label={`Tasks finished each week. ${points.map((p) => `${p.label}: ${p.value}`).join(", ")}. Average ${avg} a week.`}
      className="focus-visible:outline-foreground relative w-full rounded-field outline-none focus-visible:outline-2 focus-visible:outline-offset-4"
      style={{ height }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setFocus(Math.round(((e.clientX - r.left - L) / iw) * (n - 1)));
      }}
      onPointerLeave={() => setFocus(n - 1)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setFocus((v) => Math.min(n - 1, v + 1));
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          setFocus((v) => Math.max(0, v - 1));
        }
      }}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="block overflow-visible">
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--chart-1)", stopOpacity: 0.22 }} />
            <stop offset="1" style={{ stopColor: "var(--chart-1)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={width - R + 10} y1={Y(t)} y2={Y(t)} className="stroke-border" strokeDasharray="2 5" />
            <text x={L - 10} y={Y(t) + 4} textAnchor="end" className="fill-muted-foreground text-[12px] font-medium">
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        ))}
        <path d={area} fill={`url(#${id}-fill)`} />
        <line x1={L} x2={width - R + 10} y1={Y(average)} y2={Y(average)} className="stroke-foreground" strokeWidth={1.5} strokeDasharray="6 5" opacity={0.7} />
        <line x1={X(f)} x2={X(f)} y1={T} y2={T + ih} className="stroke-border" />
        <path ref={line} d={path} fill="none" stroke="var(--chart-1)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={X(f)} cy={Y(points[f].value)} r={5} style={{ fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 3 }} />
        {points.map((p, i) => {
          if (i % step !== 0 && i !== f && i !== n - 1) return null;
          const anchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
          const x = i === 0 ? X(i) - 6 : i === n - 1 ? X(i) + 6 : X(i);
          return (
            <text
              key={p.label}
              x={x}
              y={height - 8}
              textAnchor={anchor}
              className={i === f ? "fill-foreground text-[12px] font-bold" : "fill-muted-foreground text-[12px] font-medium"}
            >
              {p.label}
            </text>
          );
        })}
      </svg>
      <div
        aria-hidden="true"
        className="bg-popover text-popover-foreground shadow-e2 ring-foreground/8 pointer-events-none absolute min-w-[156px] -translate-x-1/2 -translate-y-full rounded-[14px] px-3 py-2.5 text-[13px] ring-1 transition-[left,top] duration-150"
        style={{ left: tipX, top: tipY }}
      >
        <b className="mb-1.5 block font-bold">Week of {points[f].label}</b>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground inline-flex items-center gap-[7px]">
            <span className="size-2 rounded-full bg-(--chart-1)" />
            Finished
          </span>
          <em className="font-bold not-italic tabular-nums">{points[f].value}</em>
        </div>
        <div className="mt-[3px] flex items-center justify-between gap-2">
          <span className="text-muted-foreground inline-flex items-center gap-[7px]">
            <span className="border-foreground w-2.5 border-t-2 border-dashed" />
            Average
          </span>
          <em className="font-bold not-italic tabular-nums">{avg}</em>
        </div>
      </div>
    </div>
  );
}

/** The legend above the chart: the series and the dashed average. */
export function PulseTrendLegend({ average }: { average: number }) {
  return (
    <div className="text-muted-foreground flex flex-wrap gap-x-[18px] gap-y-1.5 text-[13px]">
      <span className="inline-flex items-center gap-[7px]">
        <span aria-hidden="true" className="size-[9px] rounded-full bg-(--chart-1)" />
        Finished
      </span>
      <span className="inline-flex items-center gap-[7px]">
        <span aria-hidden="true" className="border-foreground w-4 border-t-2 border-dashed opacity-70" />
        Average, {Math.round(average * 10) / 10} a week
      </span>
    </div>
  );
}
