"use client";

import dynamic from "next/dynamic";

import { ChartSkeleton } from "@/components/reports/charts/chart-kit";

/**
 * The finance dashboard's charts, loaded on the client only (next/dynamic,
 * ssr: false), the same way as the report charts (reports/charts/lazy.tsx):
 * recharts stays out of the server render and the dashboard's first bundle,
 * and each placeholder takes the chart's place so nothing shifts when it lands.
 */

const fill = (shape: "rounded-md" | "rounded-full") =>
  function ChartFill() {
    return <div className={`bg-muted/50 size-full animate-pulse ${shape}`} aria-hidden="true" />;
  };

export const LazyBurnChart = dynamic(() => import("./burn-chart").then((m) => m.BurnChart), {
  ssr: false,
  loading: () => <ChartSkeleton height={220} />,
});

export const LazyBalanceTrendChart = dynamic(
  () => import("./finance-charts").then((m) => m.BalanceTrendChart),
  { ssr: false, loading: () => <ChartSkeleton height={220} /> },
);

/** Fills its parent (the widget sets the ring's size). */
export const LazyDonutChart = dynamic(() => import("./finance-charts").then((m) => m.DonutChart), {
  ssr: false,
  loading: fill("rounded-full"),
});

/** Fills its parent (the widget sets the height from the number of rows). */
export const LazyHorizontalBarChart = dynamic(
  () => import("./finance-charts").then((m) => m.HorizontalBarChart),
  { ssr: false, loading: fill("rounded-md") },
);
