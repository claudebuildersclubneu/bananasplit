import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TransactionWithRelations } from "@/app/app/[orgSlug]/finance/queries";

/** Each row opens from a real button too, so the keyboard can reach it. */

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/app/[orgSlug]/finance/transactions-actions", () => ({}));
vi.mock("@/app/app/[orgSlug]/finance/receipts-actions", () => ({}));

const { TransactionTable } = await import("./transaction-table");

afterEach(cleanup);

const row = {
  id: "txn_1",
  kind: "EXPENSE",
  direction: "OUT",
  status: "SUBMITTED",
  amountCents: 1500,
  description: "Pizza for the meeting",
  occurredAt: new Date("2026-09-01T00:00:00Z"),
  createdAt: new Date("2026-09-01T00:00:00Z"),
  budgetPeriodId: "period_1",
  categoryId: null,
  submittedById: "member_1",
  reconciledAt: null,
  voidedAt: null,
  voidReason: null,
  category: null,
  submittedBy: { id: "member_1", name: "Member", email: "m@example.edu" },
  approvedBy: null,
  reconciledBy: null,
  _count: { receipts: 0 },
} as unknown as TransactionWithRelations;

describe("TransactionTable", () => {
  it("opens a transaction from its description button", () => {
    render(
      <TransactionTable
        orgId="org_1"
        transactions={[row]}
        periods={[{ id: "period_1", label: "2026–27" }]}
        categories={[]}
        isFinance
        currentUserId="treasurer_1"
      />,
    );
    const open = screen.getByRole("button", { name: "Pizza for the meeting" });
    expect(open.getAttribute("aria-haspopup")).toBe("dialog");
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(open);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
