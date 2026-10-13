import { TransactionKind, TransactionStatus } from "@/generated/prisma/enums";

/**
 * What can still change on a transaction once it is under way. The server
 * actions enforce these; the transaction dialog reads the same rules to grey
 * out what would be refused. Pure and client-safe.
 */

export interface LockSubject {
  kind: TransactionKind;
  status: TransactionStatus;
  submittedById: string;
  reconciledAt: Date | string | null;
}

export const RECONCILED_LOCK = "This transaction is reconciled and locked. Unlock it first.";

/**
 * Why the amount and category can't change, or null when they can. Once an
 * expense is approved or paid back they are what was signed off, for
 * everyone; and nobody changes them on their own request after submitting it,
 * or they could approve one figure and claim another.
 */
export function amountLockReason(t: LockSubject, userId: string): string | null {
  if (t.reconciledAt) return RECONCILED_LOCK;
  if (t.kind !== TransactionKind.EXPENSE) return null;
  if (t.status === TransactionStatus.APPROVED) {
    return "This expense is approved, so its amount and category are locked. If they're wrong, reject or void it and record it again.";
  }
  if (t.status === TransactionStatus.REIMBURSED) {
    return "This expense has been paid back, so its amount and category are locked. If they're wrong, void it and record it again.";
  }
  if (t.submittedById === userId && t.status === TransactionStatus.SUBMITTED) {
    return "You can't change the amount or category of your own request after submitting it. Withdraw it to a draft first.";
  }
  if (t.submittedById === userId && t.status === TransactionStatus.REJECTED) {
    return "You can't change the amount or category of your own request after submitting it. File a new request instead.";
  }
  return null;
}

/**
 * Why receipts can't be added or removed, or null when they can. They are
 * the evidence an approval rests on, so they freeze once an expense is
 * approved, paid back or rejected (a rejected request can't be resubmitted).
 * Records outside the approval flow (not applicable: club money, income,
 * adjustments) keep taking paperwork from a treasurer or owner.
 */
export function receiptLockReason(t: LockSubject, isFinance: boolean): string | null {
  if (t.reconciledAt) return RECONCILED_LOCK;
  switch (t.status) {
    case TransactionStatus.DRAFT:
    case TransactionStatus.SUBMITTED:
      return null;
    case TransactionStatus.NOT_APPLICABLE:
      return isFinance ? null : "Only a treasurer or owner can change the receipts on this.";
    default:
      return "Receipts are locked once an expense is approved, paid back or rejected, so they stay the record of what was decided.";
  }
}
