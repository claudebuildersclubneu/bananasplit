import { authDb, serviceDb } from "@/server/db/clients";
import { withSystemOrgTx } from "@/server/db/context";
import { NOTE_TRASH_DAYS } from "@/lib/notes/trash";
import { PERSONAL_GUEST_DAYS } from "@/server/rsvp/personal";
import { deleteBlobs } from "@/server/storage";

import type { JobHandler } from "../types";

/**
 * Platform maintenance handlers, scheduled once a day by /api/cron/jobs
 * (scheduleDailyMaintenance) with once=true keys per UTC date.
 */

/** Rate-limit buckets are kept 40 days: longer than the longest window (30 days). */
export const BUCKET_RETENTION_SECONDS = 40 * 24 * 60 * 60;
/** Finished jobs (DONE, DEAD, CANCELLED) are kept 30 days for debugging. */
export const JOB_RETENTION_DAYS = 30;

/**
 * 0A Fix 4(d): delete credential sign-ups whose email was never verified
 * within 72 hours and that have no Account, no Membership and no
 * OrgMemberHistory. The predicates live in app.purge_unverified_users(),
 * a SECURITY DEFINER function executable by app_auth only (app_auth cannot
 * read Membership itself).
 */
export const purgeUnverifiedJob: JobHandler<unknown> = async () => {
  const rows = await authDb.$queryRaw<{ n: number }[]>`SELECT app.purge_unverified_users() AS n`;
  const n = Number(rows[0]?.n ?? 0);
  if (n > 0) console.info(`[jobs] purge-unverified removed ${n} unverified account(s)`);
};

/**
 * Notes files stay in "Recently deleted" for NOTE_TRASH_DAYS so they can be
 * restored; after that their bytes go. The window is a week wide so a few
 * missed daily runs still catch every file, without rescanning forever.
 */
async function purgeDeletedNoteFiles(now: Date = new Date()): Promise<number> {
  const day = 24 * 60 * 60 * 1000;
  const before = new Date(now.getTime() - NOTE_TRASH_DAYS * day);
  const after = new Date(before.getTime() - 7 * day);
  const orgIds = await serviceDb.$queryRaw<
    { id: string }[]
  >`SELECT id FROM app.active_org_ids() AS id`;
  let purged = 0;
  for (const { id } of orgIds) {
    const keys = await withSystemOrgTx(id, async ({ db }) =>
      (
        await db.orgFile.findMany({
          where: { organizationId: id, deletedAt: { lt: before, gte: after } },
          select: { storageKey: true },
        })
      ).map((f) => f.storageKey),
    );
    if (keys.length === 0) continue;
    await deleteBlobs(keys);
    purged += keys.length;
  }
  return purged;
}

/** Spent or replaced links are deleted at once; expired ones are kept a week, so a late click still reads "expired". */
export const AUTH_TOKEN_GRACE_DAYS = 7;

/** Password-reset and email-verification links that expired over a week ago. */
async function pruneExpiredAuthTokens(now: Date = new Date()): Promise<number> {
  const before = new Date(now.getTime() - AUTH_TOKEN_GRACE_DAYS * 24 * 60 * 60 * 1000);
  const [resets, verifies] = await authDb.$transaction([
    authDb.passwordResetToken.deleteMany({ where: { expiresAt: { lt: before } } }),
    authDb.verificationToken.deleteMany({ where: { expires: { lt: before } } }),
  ]);
  return resets.count + verifies.count;
}

/** Prunes expired rate-limit buckets, old finished jobs, stale sign-in links and long-deleted Notes files. */
export const maintenanceJob: JobHandler<unknown> = async () => {
  const buckets = await serviceDb.$queryRaw<{ n: number }[]>`
    SELECT app.prune_rate_limit_buckets(${BUCKET_RETENTION_SECONDS}::int) AS n`;
  const jobs = await serviceDb.$queryRaw<{ n: number }[]>`
    SELECT app.prune_jobs(${JOB_RETENTION_DAYS}::int) AS n`;
  const files = await purgeDeletedNoteFiles().catch((error) => {
    console.error("[jobs] purging deleted Notes files failed", error);
    return 0;
  });
  const tokens = await pruneExpiredAuthTokens().catch((error) => {
    console.error("[jobs] pruning expired sign-in links failed", error);
    return 0;
  });
  // Free RSVP pages keep their guest lists PERSONAL_GUEST_DAYS after the
  // event; clubs keep theirs (docs/features/rsvp.md, "Free pages").
  const guestLists = await serviceDb.$queryRaw<{ n: number }[]>`
    SELECT app.purge_personal_rsvp_guests(${PERSONAL_GUEST_DAYS}::int) AS n`.catch((error) => {
    console.error("[jobs] clearing free events' guest lists failed", error);
    return [{ n: 0 }];
  });
  console.info(
    `[jobs] maintenance pruned ${Number(buckets[0]?.n ?? 0)} bucket(s), ${Number(jobs[0]?.n ?? 0)} job(s), ${tokens} expired link(s), ${files} deleted file(s) and ${Number(guestLists[0]?.n ?? 0)} free event guest list(s)`,
  );
};
