"use client";

import { ChevronDown, FileSpreadsheet, ListChecks, Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { TransactionDialog } from "./transaction-dialog";

type Create = "transaction" | "request";

const CREATE: Record<Create, { label: string; icon: typeof Plus }> = {
  transaction: { label: "Add transaction", icon: Plus },
  request: { label: "Request a reimbursement", icon: Receipt },
};

/**
 * Finance's header actions, the same on every finance page: one primary
 * button and, for owners and treasurers, a menu built into it (as New
 * task's) with the rest (the other kind of new entry, Import, the setup
 * guide). A treasurer's primary
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

  const OtherIcon = CREATE[other].icon;

  return (
    <>
      {isFinance ? (
        // The primary, with the rest in its own menu (as New task's).
        <div className="flex">
          <Button
            type="button"
            variant="create"
            className="rounded-r-none pe-3"
            onClick={() => setOpen(primary)}
          >
            <PrimaryIcon className="size-4" aria-hidden="true" />
            {CREATE[primary].label}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="create"
                className="border-brand-accent-foreground/20 rounded-l-none border-l ps-2.5 pe-3"
                aria-label="More finance actions"
              >
                <ChevronDown className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem onSelect={() => setOpen(primary)}>
                <PrimaryIcon className="size-4" aria-hidden="true" />
                {CREATE[primary].label}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setOpen(other)}>
                <OtherIcon className="size-4" aria-hidden="true" />
                {CREATE[other].label}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`${base}/import`}>
                  <FileSpreadsheet className="size-4" aria-hidden="true" />
                  Import a spreadsheet
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${base}/setup`}>
                  <ListChecks className="size-4" aria-hidden="true" />
                  Setup guide
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <Button type="button" variant="create" onClick={() => setOpen(primary)}>
          <PrimaryIcon className="size-4" aria-hidden="true" />
          {CREATE[primary].label}
        </Button>
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
