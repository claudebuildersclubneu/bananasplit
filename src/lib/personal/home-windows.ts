/**
 * How far the Personal dashboard looks ahead (src/server/personal/home.ts
 * reads with these; the page says them). Pure and client-safe.
 */

/** "When you meet next" looks this far ahead. */
export const UPCOMING_DAYS = 14;
/** "Due soon": overdue, today, and the days after it up to this many in all. */
export const DUE_SOON_DAYS = 7;
