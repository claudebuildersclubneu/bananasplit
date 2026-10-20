"use client";

import { CalendarDays, CircleAlert, SquareCheckBig, Ticket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Stat, StatStrip } from "@/components/ui/stat";

/**
 * The stat strip under the greeting on every Overview, a club's and the
 * Personal home alike (redesign guide 7.4, 9): your tasks due this week
 * (with what's due today), overdue (or "All clear"), what's on the
 * calendar in the next two weeks and, at home, your RSVPs. A client
 * component so it can hand Lucide icons to Stat; pages pass plain numbers.
 */
export function OverviewStats({
  dueSoon,
  dueToday,
  overdue,
  upcoming,
  upcomingDays,
  rsvps,
  className,
}: {
  dueSoon: number;
  dueToday: number;
  overdue: number;
  upcoming: number;
  upcomingDays: number;
  /** The Personal home only. */
  rsvps?: number;
  className?: string;
}) {
  return (
    <StatStrip className={className}>
      <Stat
        icon={SquareCheckBig}
        value={dueSoon}
        label="Due this week"
        chip={dueToday > 0 ? <Badge variant="accent">{dueToday} due today</Badge> : undefined}
      />
      <Stat
        icon={CircleAlert}
        value={overdue}
        label="Overdue"
        chip={overdue === 0 ? <Badge variant="success">All clear</Badge> : undefined}
      />
      <Stat icon={CalendarDays} value={upcoming} label={`Coming up in ${upcomingDays} days`} />
      {rsvps !== undefined && <Stat icon={Ticket} value={rsvps} label="RSVPs" />}
    </StatStrip>
  );
}
