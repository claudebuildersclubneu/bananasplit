import { TransactionTable } from "@/components/finance/transaction-table";
import { handleAuthErrorInPage } from "@/lib/auth/handle-auth-error";
import { can } from "@/lib/auth/permissions";
import { formatCents } from "@/lib/finance/money";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";

import { FinanceAccessGate } from "../finance-access-gate";
import {
  getCategoriesForPeriods,
  getMoneyOwedToUser,
  getMyReimbursements,
  getOrgPeriods,
} from "../queries";

export default async function MyReimbursementsPage({
  params,
}: PageProps<"/app/[orgSlug]/finance/my-reimbursements">) {
  const { orgSlug } = await params;
  const { organization: org, user, role } = await getOrgContextBySlug(orgSlug);
  const isFinance = can({ role }, "finance.manage");

  const { transactions, periods, categories, owedCents } = await withOrgTx(
    org.id,
    async ({ db }) => {
      const transactions = await getMyReimbursements(db, org.id, user.id);
      const periods = await getOrgPeriods(db, org.id);
      const categories = await getCategoriesForPeriods(db, org.id, periods);
      const owedCents = await getMoneyOwedToUser(db, org.id, user.id);
      return { transactions, periods, categories, owedCents };
    },
  ).catch(handleAuthErrorInPage);

  // Request a reimbursement is the Finance header's button on this page.
  return (
    <div className="space-y-4">
      {!isFinance && <FinanceAccessGate orgId={org.id} orgSlug={orgSlug} role={role} compact />}
      <div className="flex flex-wrap items-center gap-4">
        <div className="rounded-xl border px-4 py-2.5">
          <p className="text-muted-foreground text-xs">Money owed to you</p>
          <p className="text-xl font-semibold tabular-nums">{formatCents(owedCents)}</p>
        </div>
        <p className="text-muted-foreground max-w-xs text-sm">
          Your own expense submissions and their reimbursement status.
        </p>
      </div>
      <TransactionTable
        orgId={org.id}
        transactions={transactions}
        periods={periods}
        categories={categories}
        isFinance={isFinance}
        currentUserId={user.id}
        emptyDescription="Nothing yet. Use “Request a reimbursement” to be paid back for something you bought for the club."
      />
    </div>
  );
}
