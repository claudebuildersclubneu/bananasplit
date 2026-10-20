"use client";

import { useId, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

import {
  AXIS_TICK,
  axisProps,
  barCursor,
  ChartLegend,
  gridProps,
  HatchPattern,
  seriesColor,
  TooltipCard,
  useChartAnimation,
  type TooltipRow,
} from "./chart-kit";

export interface BarSeries {
  label: string;
  /** A chart slot; defaults to the series' place in the order. */
  color?: string;
  /** "Not yet": striped in its colour (pending, awaiting). */
  hatch?: boolean;
  /** Series with the same stack id pile up, in the order given (bottom first). */
  stack?: string;
}

export interface BarDatum {
  /** Unique x key. */
  key: string;
  /** Axis tick text. */
  tick: string;
  /** Tooltip heading and sub-heading. */
  heading: ReactNode;
  sub?: ReactNode;
  /** One value per series, in the series' order. */
  values: readonly number[];
}

type Row = Record<string, unknown> & { key: string; datum: BarDatum };

/**
 * Columns (guide 8.2): soft rounded columns, one per x, stacked or side by
 * side; a hatched series is what isn't settled yet (pending), drawn as the
 * top of its stack. The latest column is at full strength and the others
 * step back a little; its tick is bold. Dotted gridlines, a legend above,
 * a tooltip listing every series (and the total, for a stack).
 */
export function BarsChart({
  data,
  series,
  label,
  format = (n) => String(n),
  formatAxis,
  height = 220,
  showTotal = false,
  maxBarSize,
}: {
  data: readonly BarDatum[];
  series: readonly BarSeries[];
  /** Accessible description of the chart. */
  label: string;
  format?: (n: number) => string;
  formatAxis?: (n: number) => string;
  height?: number;
  /** Add a "Total" row to the tooltip. */
  showTotal?: boolean;
  maxBarSize?: number;
}) {
  const id = useId().replace(/:/g, "");
  const motion = useChartAnimation();
  const colors = series.map((s, i) => s.color ?? seriesColor(i));
  const last = data.length - 1;
  const stacks = new Set(series.map((s, i) => s.stack ?? `solo-${i}`));
  const barSize = maxBarSize ?? (stacks.size > 1 ? 26 : 46);

  // For each column and series: is it the top (round its top) or the bottom
  // (round its foot) of the non-empty part of its stack?
  const rows: Row[] = data.map((d, di) => {
    const row: Row = { key: d.key, datum: d, __index: di };
    series.forEach((s, si) => {
      const stack = s.stack ?? `solo-${si}`;
      const mates = series
        .map((m, mi) => ({ m, mi }))
        .filter(({ m, mi }) => (m.stack ?? `solo-${mi}`) === stack && (d.values[mi] ?? 0) > 0);
      row[`v${si}`] = d.values[si] ?? 0;
      row[`top${si}`] = mates.length > 0 && mates[mates.length - 1].mi === si;
      row[`foot${si}`] = mates.length > 0 && mates[0].mi === si;
    });
    return row;
  });

  return (
    <div className="flex flex-col gap-3">
      <ChartLegend
        entries={series.map((s, i) => ({
          label: s.label,
          color: colors[i],
          shape: s.hatch ? ("hatch" as const) : ("dot" as const),
        }))}
      />
      <div role="img" aria-label={label}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={rows}
            margin={{ top: 10, right: 6, bottom: 0, left: 0 }}
            barCategoryGap="22%"
            barGap={4}
            accessibilityLayer
          >
            <defs>
              {series.map((s, i) =>
                s.hatch ? <HatchPattern key={i} id={`${id}-hatch-${i}`} color={colors[i]} /> : null,
              )}
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis
              dataKey="key"
              {...axisProps}
              interval="preserveStartEnd"
              minTickGap={20}
              tickMargin={8}
              tick={(props: {
                x?: number | string;
                y?: number | string;
                payload?: { value?: string };
                index?: number;
              }) => {
                const row = rows.find((r) => r.key === props.payload?.value);
                const isLast = row ? row.__index === last : false;
                return (
                  <text
                    x={Number(props.x)}
                    y={Number(props.y)}
                    dy={10}
                    textAnchor="middle"
                    fontSize={AXIS_TICK.fontSize}
                    fontWeight={isLast ? 700 : AXIS_TICK.fontWeight}
                    style={{ fill: isLast ? "var(--foreground)" : AXIS_TICK.fill }}
                  >
                    {row?.datum.tick ?? ""}
                  </text>
                );
              }}
            />
            <YAxis
              {...axisProps}
              allowDecimals={false}
              width={formatAxis ? 56 : 36}
              tickFormatter={(v: number) => (formatAxis ?? format)(v)}
            />
            <Tooltip
              cursor={barCursor}
              content={(props: TooltipContentProps<ValueType, NameType>) => {
                const row = props.active
                  ? (props.payload?.[0]?.payload as Row | undefined)
                  : undefined;
                if (!row) return null;
                const d = row.datum;
                const tipRows: TooltipRow[] = series
                  .map((s, i) => ({
                    label: s.label,
                    value: format(d.values[i] ?? 0),
                    color: colors[i],
                  }))
                  .reverse();
                if (showTotal) {
                  tipRows.push({
                    label: "Total",
                    value: format(d.values.reduce((sum, v) => sum + v, 0)),
                  });
                }
                return <TooltipCard heading={d.heading} sub={d.sub} rows={tipRows} />;
              }}
            />
            {series.map((s, i) => (
              <Bar
                key={s.label}
                dataKey={`v${i}`}
                name={s.label}
                stackId={s.stack}
                maxBarSize={barSize}
                fill={s.hatch ? `url(#${id}-hatch-${i})` : colors[i]}
                shape={(props: unknown) => (
                  <ColumnShape
                    {...(props as ColumnShapeProps)}
                    top={Boolean((props as ColumnShapeProps).payload?.[`top${i}`])}
                    foot={Boolean((props as ColumnShapeProps).payload?.[`foot${i}`])}
                    dim={(props as ColumnShapeProps).payload?.__index !== last}
                  />
                )}
                {...motion}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface ColumnShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  payload?: Record<string, unknown>;
  top?: boolean;
  foot?: boolean;
  dim?: boolean;
}

/** One column segment: a 10px rounded top on the top of a stack, a 5px foot at its base. */
function ColumnShape({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill,
  top,
  foot,
  dim,
}: ColumnShapeProps) {
  if (width <= 0 || height <= 0) return null;
  const rt = top ? Math.min(10, width / 2, height) : 0;
  const rb = foot ? Math.min(5, width / 2, Math.max(0, height - rt)) : 0;
  const r = x + width;
  const b = y + height;
  const d = [
    `M${x},${y + rt}`,
    rt ? `Q${x},${y} ${x + rt},${y}` : `L${x},${y}`,
    `L${r - rt},${y}`,
    rt ? `Q${r},${y} ${r},${y + rt}` : `L${r},${y}`,
    `L${r},${b - rb}`,
    rb ? `Q${r},${b} ${r - rb},${b}` : `L${r},${b}`,
    `L${x + rb},${b}`,
    rb ? `Q${x},${b} ${x},${b - rb}` : `L${x},${b}`,
    "Z",
  ].join(" ");
  return <path d={d} fill={fill} opacity={dim ? 0.78 : 1} />;
}
