import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TransactionTable } from "@/components/finance/transaction-table";
import { handleAuthErrorInPage } from "@/lib/auth/handle-auth-error";
import { can } from "@/lib/auth/permissions";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";

import { FinanceAccessGate } from "../finance-access-gate";
import {
  getCategoriesForPeriods,
  getOrgMembersForPicker,
  getOrgPeriods,
  getTransactions,
  parseTransactionFilters,
  TRANSACTION_LIST_LIMIT,
} from "../queries";
import { TransactionFilters as TransactionFiltersBar } from "./transaction-filters";

export default async function TransactionsPage({
  params,
  searchParams,
}: PageProps<"/app/[orgSlug]/finance/transactions">) {
  const { orgSlug } = await params;
  const query = await searchParams;

  const { organization: org, user, role } = await getOrgContextBySlug(orgSlug);
  // Not an owner or treasurer: who is, and what to do instead (never an error page).
  if (!can({ role }, "finance.manage")) {
    return <FinanceAccessGate orgId={org.id} orgSlug={orgSlug} role={role} />;
  }

  const param = (key: string) => {
    const value = query[key];
    return typeof value === "string" ? value : undefined;
  };

  // The active period unless the URL picks another (or "all"): every period
  // at once grows without bound. The list stops at TRANSACTION_LIST_LIMIT
  // rows (one more is read to know there are more); the CSV has them all.
  const { transactions, hasMore, filters, periods, categories, memberships } = await withOrgTx(
    org.id,
    async ({ db }) => {
      const periods = await getOrgPeriods(db, org.id);
      const filters = parseTransactionFilters(param, periods.find((p) => p.isActive)?.id);
      const rows = await getTransactions(db, org.id, filters, {
        take: TRANSACTION_LIST_LIMIT + 1,
      });
      const categories = await getCategoriesForPeriods(db, org.id, periods);
      const memberships = await getOrgMembersForPicker(db, org.id);
      return {
        transactions: rows.slice(0, TRANSACTION_LIST_LIMIT),
        hasMore: rows.length > TRANSACTION_LIST_LIMIT,
        filters,
        periods,
        categories,
        memberships,
      };
    },
  ).catch(handleAuthErrorInPage);
  const members = memberships.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
  }));
  const period = filters.budgetPeriodId ?? "all";

  // The export gets the same rows, uncapped: the period is spelled out, so it
  // matches what's on screen even when the page chose it.
  const exportQuery = new URLSearchParams([
    ...(Object.entries(query).filter(([k, v]) => k !== "period" && typeof v === "string") as [
      string,
      string,
    ][]),
    ["period", period],
  ]).toString();

  // Add transaction is in the Finance header; Show deleted is one of the filters.
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <TransactionFiltersBar
          period={period}
          periods={periods}
          categories={categories}
          members={members}
        />
        <Button variant="outline" size="sm" asChild>
          <a href={`/app/${orgSlug}/finance/transactions/export?${exportQuery}`}>
            <Download className="size-4" aria-hidden="true" />
            Export CSV
          </a>
        </Button>
      </div>

      {hasMore && (
        <p className="text-muted-foreground text-sm" role="status">
          Showing the latest {TRANSACTION_LIST_LIMIT} transactions. Narrow the filters, or export
          the CSV to see them all.
        </p>
      )}

      <TransactionTable
        orgId={org.id}
        transactions={transactions}
        periods={periods}
        categories={categories}
        isFinance
        currentUserId={user.id}
      />
    </div>
  );
}
