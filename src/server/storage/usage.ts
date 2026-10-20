import { withSystemOrgTx, type TxClient } from "@/server/db/context";

import { deleteBlobs } from "./index";

/**
 * What a space's storage is made of (Settings › Plan and storage ›
 * Storage) and the nightly reconcile's real sums. Organization.storageUsedBytes
 * is the authority for the total and for the gate; this splits it the way
 * the meter does:
 *
 *   files         Notes files (and images in notes) not in the trash
 *   receipts      every receipt
 *   noteHistory   NoteVersion rows of notes not in the trash
 *   trash         files in the trash, and the history of notes in the trash
 *
 * The sums are read on the service path (app_service, the org's context
 * only): sizes of other members' private notes and files count too, and
 * none of their names leave this module. Callers authorize first (owners
 * and admins, or the Personal owner).
 */

export interface StorageBreakdown {
  filesBytes: number;
  receiptsBytes: number;
  noteHistoryBytes: number;
  trashBytes: number;
  /** Notes and files in the trash. */
  trashItems: number;
  /** The four added up: what the counter should say. */
  totalBytes: number;
}

async function sums(db: TxClient, orgId: string): Promise<StorageBreakdown> {
  const sum = (v: { _sum: { sizeBytes: number | null } }) => Number(v._sum.sizeBytes ?? 0);
  const files = sum(
    await db.orgFile.aggregate({ where: { organizationId: orgId, deletedAt: null }, _sum: { sizeBytes: true } }),
  );
  const trashedFiles = await db.orgFile.aggregate({
    where: { organizationId: orgId, deletedAt: { not: null } },
    _sum: { sizeBytes: true },
    _count: { _all: true },
  });
  const receipts = sum(
    await db.receipt.aggregate({ where: { organizationId: orgId }, _sum: { sizeBytes: true } }),
  );
  const history = sum(
    await db.noteVersion.aggregate({
      where: { organizationId: orgId, note: { deletedAt: null } },
      _sum: { sizeBytes: true },
    }),
  );
  const trashedHistory = sum(
    await db.noteVersion.aggregate({
      where: { organizationId: orgId, note: { deletedAt: { not: null } } },
      _sum: { sizeBytes: true },
    }),
  );
  const trashedNotes = await db.note.count({
    where: { organizationId: orgId, deletedAt: { not: null } },
  });
  const trashBytes = sum(trashedFiles) + trashedHistory;
  return {
    filesBytes: files,
    receiptsBytes: receipts,
    noteHistoryBytes: history,
    trashBytes,
    trashItems: trashedFiles._count._all + trashedNotes,
    totalBytes: files + receipts + history + trashBytes,
  };
}

/** The space's storage, split for the meter (authorize first). */
export function storageBreakdown(orgId: string): Promise<StorageBreakdown> {
  return withSystemOrgTx(orgId, ({ db }) => sums(db, orgId));
}

export interface LargeFile {
  id: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
}

/** The biggest files the viewer can see (RLS: shared ones, and their own private ones). */
export function largestFiles(db: TxClient, orgId: string, take = 8): Promise<LargeFile[]> {
  return db.orgFile.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: [{ sizeBytes: "desc" }, { createdAt: "desc" }],
    select: { id: true, name: true, contentType: true, sizeBytes: true, createdAt: true },
    take,
  });
}

export interface EmptiedTrash {
  notes: number;
  files: number;
  /** The files' bytes, to delete from the store after the transaction commits. */
  fileKeys: string[];
}

/**
 * Empty trash, in the caller's transaction as the caller (RLS decides what
 * they may empty: their own, and an owner's or admin's the shared ones):
 * notes and files in the trash are deleted for good. A note's history goes
 * with it (ON DELETE CASCADE); the database takes every byte off the
 * counter; the files' bytes leave the store after commit
 * (deleteEmptiedFiles).
 */
export async function emptyTrash(db: TxClient, orgId: string): Promise<EmptiedTrash> {
  const notes = await db.note.deleteMany({
    where: { organizationId: orgId, deletedAt: { not: null } },
  });
  const files = await db.orgFile.findMany({
    where: { organizationId: orgId, deletedAt: { not: null } },
    select: { id: true, storageKey: true },
  });
  if (files.length > 0) {
    await db.orgFile.deleteMany({
      where: { organizationId: orgId, id: { in: files.map((f) => f.id) } },
    });
  }
  return { notes: notes.count, files: files.length, fileKeys: files.map((f) => f.storageKey) };
}

/** After emptyTrash commits: the files' bytes leave the store. */
export async function deleteEmptiedFiles(keys: readonly string[]): Promise<void> {
  if (keys.length > 0) await deleteBlobs(keys);
}

export interface ReconcileResult {
  orgId: string;
  counted: number;
  actual: number;
}

/**
 * The nightly check of one space (src/server/jobs/handlers/storage.ts):
 * the counter against the real sums. A drift is repaired by
 * app.storage_reconcile (the runtime roles never write the counter
 * themselves) and reported.
 */
export function reconcileOrg(orgId: string): Promise<ReconcileResult & { keys: string[] }> {
  return withSystemOrgTx(orgId, async ({ db }) => {
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { storageUsedBytes: true },
    });
    const actual = (await sums(db, orgId)).totalBytes;
    const keys = (
      await db.orgFile.findMany({ where: { organizationId: orgId }, select: { storageKey: true } })
    ).map((f) => f.storageKey);
    const counted = Number(org?.storageUsedBytes ?? 0);
    if (counted !== actual) {
      await db.$queryRaw`SELECT app.storage_reconcile(${orgId}) AS n`;
    }
    return { orgId, counted, actual, keys };
  });
}
