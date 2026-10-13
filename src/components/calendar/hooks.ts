"use client";

import { useCallback, useSyncExternalStore } from "react";

import { zonedDateKey, zonedDateTimeLocal } from "@/lib/calendar/dates";

/**
 * The things the calendar needs from outside React: the viewport width,
 * the viewer's timezone, the viewer's current day, and the current minute.
 *
 * All are read with useSyncExternalStore rather than an effect that sets
 * state. That is what the API is for, and it matters here: the server
 * renders the grid, so each hook declares the value the server used
 * (the viewer's profile zone and its day, "not narrow", "no now line") and
 * swaps in the real one on hydration without a hydration mismatch.
 */

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

function subscribeToMinute(onChange: () => void) {
  const timer = setInterval(onChange, 30_000);
  return () => clearInterval(timer);
}

/**
 * Today in `timeZone` (the zone from useViewerTimeZone). `serverKey` is
 * today in the zone the server rendered in, so the first paint matches the
 * HTML; the two differ only for a viewer whose browser is in another day.
 */
export function useTodayKey(timeZone: string, serverKey: string): string {
  return useSyncExternalStore(
    subscribeToMinute,
    () => zonedDateKey(new Date(), timeZone),
    () => serverKey,
  );
}

/** Minutes since midnight in `timeZone`, or null on the server and before hydration. */
export function useNowMinutes(timeZone: string): number | null {
  return useSyncExternalStore(
    subscribeToMinute,
    () => nowMinutesIn(timeZone),
    () => null,
  );
}

function nowMinutesIn(timeZone: string): number {
  const time = zonedDateTimeLocal(new Date(), timeZone).slice(11);
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

function subscribeNever() {
  return () => {};
}

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/**
 * The viewer's own timezone. `serverZone` is what the server rendered in
 * (for a poll, the poll's zone; for the calendar, the viewer's profile zone,
 * else the org's), so the first paint matches the HTML and the browser's
 * zone is swapped in on hydration.
 */
export function useViewerTimeZone(serverZone: string): string {
  return useSyncExternalStore(subscribeNever, deviceTimeZone, () => serverZone);
}
