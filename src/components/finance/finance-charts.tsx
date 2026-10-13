"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCents } from "@/lib/finance/money";

/**
 * The finance dashboard's recharts charts. Widgets load them through
 * lazy-charts.tsx only, so recharts stays out of the dashboard's first
 * bundle. Each fills the box its widget gives it.
 */

const money = (cents: number) => formatCents(cents).replace(/\.00$/, "");

const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const tooltipMoney = (value: unknown) => formatCents(Number(value ?? 0));

/** The running balance after each day with activity. */
export function BalanceTrendChart({ data }: { data: { date: string; balanceCents: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickFormatter={(d: string) => shortDate.format(new Date(d))}
          minTickGap={24}
        />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => money(v)} width={70} />
        <Tooltip
          formatter={tooltipMoney}
          labelFormatter={(d) => shortDate.format(new Date(String(d)))}
        />
        <Area
          type="monotone"
          dataKey="balanceCents"
          name="Balance"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#trendFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export interface ChartSlice {
  key: string;
  label: string;
  cents: number;
  color: string;
}

/** A ring of shares (spend by category, income by source); the widget draws the legend. */
export function DonutChart({ slices }: { slices: ChartSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={slices}
          dataKey="cents"
          nameKey="label"
          innerRadius="58%"
          outerRadius="100%"
          paddingAngle={2}
          stroke="none"
        >
          {slices.map((s) => (
            <Cell key={s.key} fill={s.color} />
          ))}
        </Pie>
        <Tooltip formatter={tooltipMoney} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars, one per row (money out by type). */
export function HorizontalBarChart({ rows }: { rows: ChartSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 12 }} />
        <Tooltip formatter={tooltipMoney} />
        <Bar dataKey="cents" name="Spent" radius={[0, 4, 4, 0]}>
          {rows.map((r) => (
            <Cell key={r.key} fill={r.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
