"use client";

import { Ban, CircleAlert, Clock, SquareCheckBig } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Stat, StatStrip } from "@/components/ui/stat";

/**
 * "My week at a glance" as the stat strip in the Overview's header
 * (redesign guide 7.4, 9): open tasks with what's due today, overdue (or
 * "All clear"), blocked, and when the next meeting is. A client component
 * so it can hand Lucide icons to Stat; the page passes plain numbers.
 */
export function OverviewStats({
  stats,
  nextMeeting,
  className,
}: {
  stats: { open: number; today: number; overdue: number; blocked: number };
  /** "7:00 PM" and "Officer meeting, tomorrow"; null when none is coming. */
  nextMeeting: { time: string; label: string } | null;
  className?: string;
}) {
  return (
    <StatStrip className={className}>
      <Stat
        icon={SquareCheckBig}
        value={stats.open}
        label="Open tasks"
        chip={stats.today > 0 ? <Badge variant="accent">{stats.today} due today</Badge> : undefined}
      />
      <Stat
        icon={CircleAlert}
        value={stats.overdue}
        label="Overdue"
        chip={stats.overdue === 0 ? <Badge variant="success">All clear</Badge> : undefined}
      />
      <Stat icon={Ban} value={stats.blocked} label="Blocked" />
      <Stat
        icon={Clock}
        value={nextMeeting?.time ?? "None"}
        label={nextMeeting?.label ?? "No meetings coming up"}
      />
    </StatStrip>
  );
}
