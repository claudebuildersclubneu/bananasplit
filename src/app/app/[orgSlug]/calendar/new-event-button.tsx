"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { NEW_EVENT_PARAM } from "@/lib/calendar/range";

/**
 * New event in the page header, on a phone only (the desktop's is the
 * split button in the calendar's toolbar). It adds ?new=1 to the calendar
 * you're looking at, which opens the event form (EventCalendar), so the
 * month or week you were on stays put.
 */
export function NewEventButton() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  params.set(NEW_EVENT_PARAM, "1");
  return (
    <Button variant="create" className="md:hidden" asChild>
      <Link href={`${pathname}?${params.toString()}`} scroll={false}>
        <Plus className="size-4" aria-hidden="true" />
        New event
      </Link>
    </Button>
  );
}
