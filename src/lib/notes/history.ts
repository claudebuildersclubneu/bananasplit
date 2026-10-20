/**
 * Version history (NoteVersion): how often autosave snapshots are taken and
 * how long they are kept.
 *
 * - A snapshot is the note as it was just before an editing session: the
 *   first save after SNAPSHOT_INTERVAL_MS without one keeps the previous
 *   body (autosave and live saves alike), so a burst of typing costs at
 *   most one version every ten minutes.
 * - Named versions ("Name this version") are kept until someone deletes
 *   them; autosave snapshots are pruned after the plan's history window.
 */

/** At most one autosave snapshot per note in this long. */
export const SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000;

/** Days autosave snapshots are kept, until plans set their own. */
export const NOTE_HISTORY_DAYS = 90;

/**
 * The note-history window for an org's plan, in days.
 *
 * TODO(plans): per-plan limits land with PLAN_LIMITS (src/lib/billing);
 * read the plan's window here and every caller (snapshot pruning, the
 * history panel's note) follows.
 */
export function noteHistoryWindowDays(_plan?: string | null): number {
  return NOTE_HISTORY_DAYS;
}

/** The oldest autosave snapshot kept now. */
export function historyCutoff(now: Date = new Date(), plan?: string | null): Date {
  return new Date(now.getTime() - noteHistoryWindowDays(plan) * 24 * 60 * 60 * 1000);
}

/** Whether a note last snapshotted at `last` takes a new snapshot now. */
export function snapshotDue(last: Date | null, now: Date = new Date()): boolean {
  return last === null || now.getTime() - last.getTime() >= SNAPSHOT_INTERVAL_MS;
}

export const VERSION_NAME_MAX = 120;
