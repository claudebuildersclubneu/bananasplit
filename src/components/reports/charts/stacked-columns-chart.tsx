"use client";

import { formatCount } from "../format";
import { BarsChart } from "./bars-chart";

export interface StackedColumn {
  /** Unique x key. */
  key: string;
  /** Axis tick text. */
  tick: string;
  /** Tooltip heading and sub-heading. */
  heading: string;
  sub?: string;
  /** Bottom segment, then top segment. */
  values: [number, number];
}

export const STACKED_CHART_HEIGHT = 240;

/**
 * Two-series stacked columns (part-to-whole per x), from the chart kit's
 * columns: the bottom series wears slot 1, the top slot 2 (or, with
 * `hatchTop`, a hatch of slot 1 for "not yet"), with a legend and a tooltip
 * listing both and their total.
 */
export function StackedColumnsChart({
  columns,
  series,
  label,
  hatchTop = false,
}: {
  columns: StackedColumn[];
  /** Names of the bottom and top series. */
  series: [string, string];
  /** Accessible description of the chart. */
  label: string;
  /** The top series is "not yet" (hatched in slot 1) rather than slot 2. */
  hatchTop?: boolean;
}) {
  return (
    <BarsChart
      label={label}
      height={STACKED_CHART_HEIGHT}
      format={formatCount}
      showTotal
      series={[
        { label: series[0], stack: "all" },
        hatchTop
          ? { label: series[1], stack: "all", hatch: true, color: "var(--chart-1)" }
          : { label: series[1], stack: "all" },
      ]}
      data={columns.map((c) => ({
        key: c.key,
        tick: c.tick,
        heading: c.heading,
        sub: c.sub,
        values: c.values,
      }))}
    />
  );
}
