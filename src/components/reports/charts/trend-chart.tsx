"use client";

import { useId, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

import {
  AreaGradient,
  AXIS_TICK,
  axisProps,
  ChartLegend,
  gridProps,
  referenceProps,
  SERIES,
  SURFACE,
  TooltipCard,
  useChartAnimation,
  type LegendEntry,
  type TooltipRow,
} from "./chart-kit";

export interface TrendPoint {
  /** Unique x key. */
  key: string;
  /** Axis tick text ("Oct 5"). */
  tick: string;
  /** Tooltip heading and sub-heading. */
  heading: ReactNode;
  sub?: ReactNode;
  value: number;
}

/**
 * Line and area (guide 8.1): a trend over time in one series (slot 1 by
 * default), a soft wash under the line, a dashed reference line (an
 * average, where the period started), and a dot on the latest point. Hover
 * or the arrow keys move the tooltip. The legend names the series and the
 * reference; the latest tick is bold.
 */
export function TrendChart({
  points,
  seriesLabel,
  reference,
  format = (n) => String(n),
  formatAxis,
  height = 220,
  label,
  color = SERIES[0],
  allowDecimals = false,
}: {
  points: readonly TrendPoint[];
  /** The series' name in the legend and tooltip ("Check-ins", "Balance"). */
  seriesLabel: string;
  /** The dashed line: a value and what it is ("Average, 5.4 a session"). */
  reference?: { value: number; label: string; short?: string } | null;
  /** Values in the tooltip and legend. */
  format?: (n: number) => string;
  /** Values on the y axis (defaults to `format`). */
  formatAxis?: (n: number) => string;
  height?: number;
  /** Accessible description of the chart. */
  label: string;
  color?: string;
  allowDecimals?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const motion = useChartAnimation();
  const byKey = new Map(points.map((p) => [p.key, p]));
  const last = points.length - 1;
  const legend: LegendEntry[] = [{ label: seriesLabel, color, shape: "dot" }];
  if (reference) legend.push({ label: reference.label, shape: "dash" });

  return (
    <div className="flex flex-col gap-3">
      <ChartLegend entries={legend} />
      <div role="img" aria-label={label}>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={points as TrendPoint[]}
            margin={{ top: 10, right: 14, bottom: 0, left: 0 }}
            accessibilityLayer
          >
            <defs>
              <AreaGradient id={`${id}-wash`} color={color} />
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis
              dataKey="key"
              {...axisProps}
              interval="preserveStartEnd"
              minTickGap={28}
              tickMargin={8}
              tick={(props: {
                x?: number | string;
                y?: number | string;
                payload?: { value?: string; index?: number };
                index?: number;
                textAnchor?: string;
              }) => {
                const key = props.payload?.value ?? "";
                const isLast = props.index === last || byKey.get(key) === points[last];
                return (
                  <text
                    x={Number(props.x)}
                    y={Number(props.y)}
                    dy={10}
                    textAnchor={props.textAnchor as "start" | "middle" | "end" | undefined}
                    fontSize={AXIS_TICK.fontSize}
                    fontWeight={isLast ? 700 : AXIS_TICK.fontWeight}
                    style={{ fill: isLast ? "var(--foreground)" : AXIS_TICK.fill }}
                  >
                    {byKey.get(key)?.tick ?? ""}
                  </text>
                );
              }}
            />
            <YAxis
              {...axisProps}
              allowDecimals={allowDecimals}
              width={formatAxis ? 56 : 36}
              tickFormatter={(v: number) => (formatAxis ?? format)(v)}
            />
            {reference ? <ReferenceLine y={reference.value} {...referenceProps} /> : null}
            <Tooltip
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              content={(props: TooltipContentProps<ValueType, NameType>) => {
                const p = props.active
                  ? (props.payload?.[0]?.payload as TrendPoint | undefined)
                  : undefined;
                if (!p) return null;
                const rows: TooltipRow[] = [{ label: seriesLabel, value: format(p.value), color }];
                if (reference) {
                  rows.push({
                    label: reference.short ?? "Reference",
                    value: format(reference.value),
                    shape: "dash",
                  });
                }
                return <TooltipCard heading={p.heading} sub={p.sub} rows={rows} />;
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              name={seriesLabel}
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={`url(#${id}-wash)`}
              activeDot={{ r: 5, fill: color, stroke: SURFACE, strokeWidth: 3 }}
              dot={(props: { cx?: number; cy?: number; index?: number }) =>
                props.index === last && props.cx !== undefined && props.cy !== undefined ? (
                  <circle
                    key="last"
                    cx={props.cx}
                    cy={props.cy}
                    r={5}
                    style={{ fill: color, stroke: SURFACE, strokeWidth: 3 }}
                  />
                ) : (
                  <g key={`d-${props.index}`} />
                )
              }
              {...motion}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
