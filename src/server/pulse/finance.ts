import { TransactionStatus, type Role } from "@/generated/prisma/client";
import { can } from "@/lib/auth/permissions";
import type { PulseFinance } from "@/lib/pulse/data";
import type { TxClient } from "@/server/db/context";

import { rangeInstants, type PulseRange } from "./generate";

/**
 * "Money moved", for finance roles only (redesign guide 15.1). It is never
 * stored on the issue: it is worked out when someone who holds
 * finance.manage opens the issue or is sent it, so money stays off every
 * other member's screen and inbox.
 */

/** Whether a member with `role` sees the pulse's finance lines. */
export function seesPulseFinance(role: Role | null | undefined): boolean {
  return can({ role }, "finance.manage");
}

const SETTLED = [
  TransactionStatus.APPROVED,
  TransactionStatus.REIMBURSED,
  TransactionStatus.NOT_APPLICABLE,
];

/**
 * Money in and out in the week, and expenses waiting for review. `db` is
 * the viewer's transaction (RLS: finance roles read transactions) or the
 * pulse job's service transaction after it checked the recipient's role.
 */
export async function loadPulseFinance(
  db: TxClient,
  organizationId: string,
  range: PulseRange,
  timeZone: string,
  now: Date,
): Promise<PulseFinance> {
  const { start, end } = rangeInstants(range, timeZone, now);
  const sums = await db.transaction.groupBy({
    by: ["direction"],
    where: {
      organizationId,
      voidedAt: null,
      status: { in: SETTLED },
      occurredAt: { gte: start, lt: end },
    },
    _sum: { amountCents: true },
  });
  const pendingReimbursements = await db.transaction.count({
    where: { organizationId, voidedAt: null, status: TransactionStatus.SUBMITTED },
  });
  const total = (direction: "IN" | "OUT") =>
    sums.find((s) => s.direction === direction)?._sum.amountCents ?? 0;
  return { inCents: total("IN"), outCents: total("OUT"), pendingReimbursements };
}
