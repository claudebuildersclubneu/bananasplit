import Link from "next/link";
import { redirect } from "next/navigation";

import { FinanceBoard } from "@/components/finance/finance-board";
import { FinanceSetupBanner } from "@/components/finance/setup/setup-banner";
import { handleAuthErrorInPage } from "@/lib/auth/handle-auth-error";
import { can } from "@/lib/auth/permissions";
import { visibleFinanceCards } from "@/lib/finance/dashboard-cards";
import { coreSetupDone } from "@/lib/finance/setup";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";
import { resolveLayout } from "@/lib/finance/widgets";
import { loadSavedBoard } from "@/server/boards";
import { loadSetupState } from "@/server/finance/setup";

import { getDashboardData } from "./queries";

/**
 * The finance dashboard (OWNER/TREASURER): each member's own board of
 * widgets, under the header's Add transaction. It never dead-ends: until the
 * budget basics are in place the setup guide's banner sits on top (Finance ›
 * Set up), the board shows empty widgets, and the first transaction sets up
 * this school year by itself. Everyone else lands on their reimbursements.
 */
export default async function FinancePage({ params }: PageProps<"/app/[orgSlug]/finance">) {
  const { orgSlug } = await params;
  const { organization: org, user, role, settings } = await getOrgContextBySlug(orgSlug);

  if (!can({ role }, "finance.manage")) {
    redirect(`/app/${orgSlug}/finance/my-reimbursements`);
  }

  const orgCards = visibleFinanceCards(settings?.financeDashboardCards);
  const { dashboard, saved, setup } = await withOrgTx(org.id, async ({ db }) => ({
    dashboard: await getDashboardData(db, org.id),
    saved: await loadSavedBoard(db, org.id, user.id, "finance"),
    setup: await loadSetupState(db, org.id, user.id),
  })).catch(handleAuthErrorInPage);

  return (
    <div className="space-y-6">
      {!coreSetupDone(setup) && (
        <FinanceSetupBanner orgId={org.id} orgSlug={orgSlug} state={setup} />
      )}

      {dashboard.unreconciledOver60DaysCount > 0 && (
        <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border p-3 text-sm">
          {dashboard.unreconciledOver60DaysCount} transaction(s) are unreconciled and over 60 days
          old.{" "}
          <Link href={`/app/${orgSlug}/finance/transactions?reconciled=no`} className="underline">
            Review them
          </Link>
        </p>
      )}

      <FinanceBoard
        orgId={org.id}
        orgSlug={orgSlug}
        data={dashboard}
        setup={setup}
        initialLayout={resolveLayout(saved, orgCards)}
        customized={saved !== null}
      />
    </div>
  );
}
