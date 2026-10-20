import { formatStorage } from "@/lib/billing/storage";
import { serviceDb } from "@/server/db/clients";
import { sweepDirectOrphans } from "@/server/storage/direct";
import { reconcileOrg } from "@/server/storage/usage";

import type { JobHandler } from "../types";

/**
 * The nightly storage job (redesign guide 11.2), scheduled once a day with
 * the maintenance jobs (scheduleDailyMaintenance):
 *
 * - re-adds every space's files, receipts, note history and trash and
 *   compares the sum with Organization.storageUsedBytes, which the
 *   database's triggers keep. The runtime roles can't write the counter,
 *   so a drift is logged ([storage] drift) for the operator, not repaired
 *   (that needs a SECURITY DEFINER reconcile in the database);
 * - deletes direct uploads that never got a row a day after they were
 *   made (src/server/storage/direct.ts), so an abandoned upload doesn't
 *   keep bytes nobody is counted for.
 */
export const storageReconcileJob: JobHandler<unknown> = async ({ deadline }) => {
  const orgIds = await serviceDb.$queryRaw<{ id: string }[]>`SELECT id FROM app.active_org_ids() AS id`;
  let checked = 0;
  let drifted = 0;
  let orphans = 0;
  for (const { id } of orgIds) {
    // Leave time to finish cleanly; tomorrow's run picks up the rest.
    if (Date.now() > deadline - 5_000) break;
    try {
      const result = await reconcileOrg(id);
      checked += 1;
      if (result.counted !== result.actual) {
        drifted += 1;
        console.warn(
          `[storage] drift in ${id}: counted ${result.counted} bytes (${formatStorage(result.counted)}), actual ${result.actual} (${formatStorage(result.actual)})`,
        );
      }
      orphans += await sweepDirectOrphans(id, new Set(result.keys));
    } catch (error) {
      console.error(`[storage] reconcile failed for ${id}`, error);
    }
  }
  console.info(
    `[jobs] storage-reconcile checked ${checked} space(s): ${drifted} drifted, ${orphans} abandoned upload(s) deleted`,
  );
};
