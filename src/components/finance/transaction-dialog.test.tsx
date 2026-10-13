import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TransactionWithRelations } from "@/app/app/[orgSlug]/finance/queries";

/**
 * The transaction dialog shows only what the server would allow: no
 * workflow on a voided expense, Mark not applicable for finance only, a
 * locked amount on an approved expense, and a new entry dated the club's
 * today rather than UTC's.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/app/[orgSlug]/finance/transactions-actions", () => ({}));
vi.mock("@/app/app/[orgSlug]/finance/receipts-actions", () => ({
  listReceiptsAction: vi.fn(async () => ({ receipts: [] })),
}));

const { TransactionDialog } = await import("./transaction-dialog");

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const person = { id: "member_1", name: "Member", email: "m@example.edu" };

function expense(overrides: Partial<TransactionWithRelations> = {}): TransactionWithRelations {
  return {
    id: "txn_1",
    organizationId: "org_1",
    budgetPeriodId: "period_1",
    categoryId: null,
    direction: "OUT",
    kind: "EXPENSE",
    amountCents: 1500,
    currency: "USD",
    description: "Pizza",
    counterparty: null,
    occurredAt: new Date("2026-09-01T00:00:00Z"),
    paymentMethod: null,
    status: "SUBMITTED",
    submittedById: "member_1",
    approvedById: null,
    approvedAt: null,
    reimbursedAt: null,
    reimbursementMethod: null,
    rejectionReason: null,
    reconciledAt: null,
    reconciledById: null,
    statementRef: null,
    eventId: null,
    taskId: null,
    voidedAt: null,
    voidReason: null,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    updatedAt: new Date("2026-09-01T00:00:00Z"),
    category: null,
    submittedBy: person,
    approvedBy: null,
    reconciledBy: null,
    _count: { receipts: 0 },
    ...overrides,
  };
}

function show(
  transaction: TransactionWithRelations | null,
  opts: { isFinance?: boolean; currentUserId?: string; timeZone?: string } = {},
) {
  render(
    <TransactionDialog
      orgId="org_1"
      open
      onOpenChange={() => undefined}
      transaction={transaction}
      periods={[{ id: "period_1", label: "2026–27" }]}
      categories={[]}
      isFinance={opts.isFinance ?? true}
      currentUserId={opts.currentUserId ?? "treasurer_1"}
      timeZone={opts.timeZone}
    />,
  );
}

describe("TransactionDialog", () => {
  it("dates a new entry with the club's today, not UTC's", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 9pm in New York on Oct 12 is already Oct 13 in UTC.
    vi.setSystemTime(new Date("2026-10-13T01:00:00Z"));
    show(null, { timeZone: "America/New_York" });
    expect(screen.getByLabelText("Date")).toHaveProperty("value", "2026-10-12");
  });

  it("offers approval on a pending expense, but nothing on a voided one", () => {
    show(expense());
    expect(screen.getByRole("button", { name: "Approve" })).toBeTruthy();
    cleanup();

    show(expense({ voidedAt: new Date(), voidReason: "Duplicate" }));
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reject" })).toBeNull();
  });

  it("keeps Mark not applicable for finance", () => {
    show(expense({ status: "DRAFT" }), { isFinance: false, currentUserId: "member_1" });
    expect(screen.getByRole("button", { name: "Submit" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Mark not applicable" })).toBeNull();
    cleanup();

    show(expense({ status: "DRAFT" }));
    expect(screen.getByRole("button", { name: "Mark not applicable" })).toBeTruthy();
  });

  it("locks the amount of an approved expense and says why", () => {
    show(expense({ status: "APPROVED" }));
    expect(screen.getByLabelText("Amount")).toHaveProperty("disabled", true);
    expect(screen.getByLabelText("Description")).toHaveProperty("disabled", false);
    expect(screen.getByText(/amount and category are locked/)).toBeTruthy();
  });
});
