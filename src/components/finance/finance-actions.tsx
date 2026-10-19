"use client";

import { FileSpreadsheet, ListChecks, Plus, Receipt } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ItemMenu } from "@/components/item-menu";
import { Button } from "@/components/ui/button";

import { TransactionDialog } from "./transaction-dialog";

type Create = "transaction" | "request";

const CREATE: Record<Create, { label: string; icon: typeof Plus }> = {
  transaction: { label: "Add transaction", icon: Plus },
  request: { label: "Request a reimbursement", icon: Receipt },
};

/**
 * Finance's header actions, the same on every finance page: one primary
 * button and, for owners and treasurers, a "…" menu with the rest (the
 * other kind of new entry, Import, the setup guide). A treasurer's primary
 * is Add transaction, or Request a reimbursement on their own
 * reimbursements; everyone else can only ask to be paid back.
 */
export function FinanceActions({
  orgId,
  orgSlug,
  isFinance,
  currentUserId,
  periods,
  categories,
}: {
  orgId: string;
  orgSlug: string;
  isFinance: boolean;
  currentUserId: string;
  periods: { id: string; label: string }[];
  categories: { id: string; name: string; budgetPeriodId: string }[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState<Create | null>(null);
  const base = `/app/${orgSlug}/finance`;
  const primary: Create =
    !isFinance || pathname === `${base}/my-reimbursements` ? "request" : "transaction";
  const other: Create = primary === "request" ? "transaction" : "request";
  const PrimaryIcon = CREATE[primary].icon;

  return (
    <>
      <Button type="button" variant="create" onClick={() => setOpen(primary)}>
        <PrimaryIcon className="size-4" aria-hidden="true" />
        {CREATE[primary].label}
      </Button>
      {isFinance && (
        <ItemMenu
          label="More finance actions"
          items={[
            {
              label: CREATE[other].label,
              icon: CREATE[other].icon,
              onSelect: () => setOpen(other),
            },
            {
              label: "Import a spreadsheet",
              icon: FileSpreadsheet,
              href: `${base}/import`,
              separated: true,
            },
            { label: "Setup guide", icon: ListChecks, href: `${base}/setup` },
          ]}
        />
      )}
      <TransactionDialog
        orgId={orgId}
        open={open !== null}
        onOpenChange={(o) => {
          if (!o) setOpen(null);
        }}
        transaction={null}
        periods={periods}
        categories={categories}
        isFinance={isFinance}
        request={open === "request"}
        currentUserId={currentUserId}
      />
    </>
  );
}
