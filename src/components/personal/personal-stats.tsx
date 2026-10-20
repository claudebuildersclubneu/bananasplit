"use client";

import { CalendarDays, CircleAlert, SquareCheckBig, Ticket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Stat, StatStrip } from "@/components/ui/stat";

/**
 * The Personal home's stat strip (the Overview's language): what's due
 * soon across your spaces, overdue, what's on in the next two weeks and
 * your RSVPs. A client component so it can hand Lucide icons to Stat.
 */
export function PersonalStats({
  dueSoon,
  dueToday,
  overdue,
  upcoming,
  upcomingDays,
  rsvps,
}: {
  dueSoon: number;
  dueToday: number;
  overdue: number;
  upcoming: number;
  upcomingDays: number;
  rsvps: number;
}) {
  return (
    <StatStrip>
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
      <Stat icon={Ticket} value={rsvps} label="RSVPs" />
    </StatStrip>
  );
}
