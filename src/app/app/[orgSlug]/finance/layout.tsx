import { FinanceActions } from "@/components/finance/finance-actions";
import { PageHeader } from "@/components/page-header";
import { PageTabs } from "@/components/ui/page-tabs";
import { handleAuthErrorInPage } from "@/lib/auth/handle-auth-error";
import { can } from "@/lib/auth/permissions";
import { spaceIncludes } from "@/lib/billing/space";
import { sectionLabel } from "@/lib/nav/sidebar";
import { getOrgContextBySlug, withOrgTx } from "@/server/db/context";

import { getCategoriesForPeriods, getOrgPeriods } from "./queries";

/**
 * Every finance page's header: the title; Add transaction (Request a
 * reimbursement for a member) with Import and the setup guide in its "…"
 * menu; and, for owners and treasurers, the pages they use day to day as
 * tabs. A member only has My reimbursements, so they get no tabs.
 */
export default async function FinanceLayout({
  params,
  children,
}: LayoutProps<"/app/[orgSlug]/finance">) {
  const { orgSlug } = await params;
  // Unknown slug or not a member: notFound() (getOrgContextBySlug).
  const { organization: org, user, role, settings } = await getOrgContextBySlug(orgSlug);
  // Not on the plan: the page shows the upgrade screen, without the header.
  if (!spaceIncludes(org, "finance")) return children;
  const isFinance = can({ role }, "finance.manage");
  // For the header's new-entry dialog (which period, which category).
  const { periods, categories } = await withOrgTx(org.id, async ({ db }) => {
    const periods = await getOrgPeriods(db, org.id);
    return { periods, categories: await getCategoriesForPeriods(db, org.id, periods) };
  }).catch(handleAuthErrorInPage);
  const base = `/app/${orgSlug}/finance`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={sectionLabel(settings?.sidebar, "finance")}
        actions={
          <FinanceActions
            orgId={org.id}
            orgSlug={orgSlug}
            isFinance={isFinance}
            currentUserId={user.id}
            // The active period first: a new entry defaults to it.
            periods={[...periods]
              .sort((a, b) => Number(b.isActive) - Number(a.isActive))
              .map((p) => ({ id: p.id, label: p.label }))}
            categories={categories.map((c) => ({
              id: c.id,
              name: c.name,
              budgetPeriodId: c.budgetPeriodId,
            }))}
          />
        }
        tabs={
          isFinance ? (
            <PageTabs
              label="Finance"
              tabs={[
                { label: "Dashboard", href: base, exact: true },
                { label: "Transactions", href: `${base}/transactions` },
                { label: "Budget", href: `${base}/budget` },
                ...(spaceIncludes(org, "sponsorships")
                  ? [{ label: "Sponsorships", href: `${base}/sponsorships` }]
                  : []),
                { label: "My reimbursements", href: `${base}/my-reimbursements` },
              ]}
            />
          ) : undefined
        }
      />
      {children}
    </div>
  );
}
