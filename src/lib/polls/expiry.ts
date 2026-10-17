/**
 * Find a time polls clean up after themselves: each one is deleted
 * FIND_A_TIME_KEEP_DAYS after the last day it offers (its last slot's end),
 * whether or not it was scheduled. Answers go with it; an event it
 * scheduled stays on the calendar. The daily maintenance job does the
 * deleting (src/server/jobs/handlers/maintenance.ts); until it runs, the
 * list and the poll's pages already treat a poll past its date as gone.
 *
 * Pure and client-safe.
 */

export const FIND_A_TIME_KEEP_DAYS = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

/** When a poll whose last slot ends at `lastSlotEndsAt` is deleted. */
export function availabilityExpiresAt(lastSlotEndsAt: Date): Date {
  return new Date(lastSlotEndsAt.getTime() + FIND_A_TIME_KEEP_DAYS * DAY_MS);
}

/** A poll whose last slot ended before this is past keeping. */
export function availabilityExpiryCutoff(now: Date): Date {
  return new Date(now.getTime() - FIND_A_TIME_KEEP_DAYS * DAY_MS);
}
