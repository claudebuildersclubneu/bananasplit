"use server";

import { can } from "@/lib/auth/permissions";
import { writeFinanceAuditLog } from "@/lib/finance/audit";
import { receiptLockReason } from "@/lib/finance/locks";
import { deleteReceiptBlobs } from "@/lib/finance/receipt-storage";
import { receiptDownloadUrl } from "@/lib/finance/receipt-signed-url";
import { withOrgAction, type OrgContext } from "@/server/db/context";

// Uploads go through POST /api/orgs/{orgId}/receipts (0A Fix 15): a route
// handler, because Server Actions accept 1 MB bodies and receipts are
// phone photos.

interface ActionResult {
  error?: string;
  receiptId?: string;
}

/** The transaction's submitter, or OWNER/TREASURER (the Receipt policy repeats this). */
function canAccessTransaction(ctx: OrgContext, transaction: { submittedById: string }) {
  return transaction.submittedById === ctx.userId || can(ctx, "finance.manage");
}

/**
 * A transaction's receipts, for the transaction dialog (the lists only carry
 * a count). Same permission check as the parent transaction; RLS repeats it.
 */
export const listReceiptsAction = withOrgAction(
  async (
    ctx,
    transactionId: string,
  ): Promise<{ receipts?: { id: string; filename: string }[]; error?: string }> => {
    const transaction = await ctx.db.transaction.findFirst({
      where: { id: transactionId, organizationId: ctx.organizationId },
      select: { submittedById: true },
    });
    if (!transaction || !canAccessTransaction(ctx, transaction)) {
      return { error: "Transaction not found." };
    }
    const receipts = await ctx.db.receipt.findMany({
      where: { transactionId, organizationId: ctx.organizationId },
      select: { id: true, filename: true },
      orderBy: { uploadedAt: "asc" },
    });
    return { receipts };
  },
);

/**
 * Deletes the row in the action's transaction and the file after it commits
 * (row first, blob second: a failed blob delete leaves an orphan file, never
 * a row pointing at nothing). Only while the expense is still open
 * (receiptLockReason), and every removal is in the finance audit log.
 * Error semantics: { error } before the write (case a); the Blob delete is
 * network I/O and runs after commit (case d).
 */
export const deleteReceiptAction = withOrgAction(
  async (ctx, receiptId: string): Promise<ActionResult> => {
    const receipt = await ctx.db.receipt.findFirst({
      where: { id: receiptId, organizationId: ctx.organizationId },
      include: {
        transaction: {
          select: { submittedById: true, kind: true, status: true, reconciledAt: true },
        },
      },
    });
    if (!receipt) return { error: "Receipt not found." };
    if (!canAccessTransaction(ctx, receipt.transaction)) {
      return { error: "You don't have permission to remove this receipt." };
    }
    const locked = receiptLockReason(receipt.transaction, can(ctx, "finance.manage"));
    if (locked) return { error: locked };

    await ctx.db.receipt.deleteMany({
      where: { id: receiptId, organizationId: ctx.organizationId },
    });
    await writeFinanceAuditLog(ctx.db, {
      organizationId: ctx.organizationId,
      transactionId: receipt.transactionId,
      action: "RECEIPT_DELETE",
      before: {
        receiptId: receipt.id,
        filename: receipt.filename,
        mimeType: receipt.mimeType,
        sizeBytes: receipt.sizeBytes,
        uploadedById: receipt.uploadedById,
        uploadedAt: receipt.uploadedAt,
      },
    });
    const blobKey = receipt.blobKey;
    ctx.afterCommit(() => deleteReceiptBlobs([blobKey]));
    return {};
  },
);

/**
 * Returns a short-lived signed download URL, only after re-running the same
 * permission check as the parent transaction (spec 5.5) — never the raw
 * blob key/URL.
 */
export const getSignedReceiptUrl = withOrgAction(
  async (ctx, receiptId: string): Promise<{ url?: string; error?: string }> => {
    const receipt = await ctx.db.receipt.findFirst({
      where: { id: receiptId, organizationId: ctx.organizationId },
      include: { transaction: { select: { submittedById: true } } },
    });
    if (!receipt) return { error: "Receipt not found." };
    if (!canAccessTransaction(ctx, receipt.transaction)) {
      return { error: "You don't have permission to view this receipt." };
    }

    return { url: receiptDownloadUrl(receiptId, ctx.organizationId) };
  },
);
