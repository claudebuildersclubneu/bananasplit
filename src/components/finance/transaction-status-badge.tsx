import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import type { TransactionStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REIMBURSED: "Reimbursed",
  REJECTED: "Rejected",
  NOT_APPLICABLE: "N/A",
};

/**
 * A transaction's status as a chip (Moonstone): money still to be paid back
 * (submitted, approved) is hatched, the "not yet" pattern; reimbursed is the
 * success tint; rejected the danger tint; a draft is an outline.
 */
export function TransactionStatusBadge({
  status,
  label,
  className,
}: {
  status: TransactionStatus;
  /** Override the word ("To approve", "To pay back"). */
  label?: string;
  className?: string;
}) {
  const text = label ?? STATUS_LABELS[status];
  switch (status) {
    case "SUBMITTED":
    case "APPROVED":
      return <PendingChip className={className}>{text}</PendingChip>;
    case "REIMBURSED":
      return (
        <Badge variant="success" className={className}>
          {text}
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge variant="destructive" className={className}>
          {text}
        </Badge>
      );
    case "DRAFT":
      return (
        <Badge variant="outline" className={className}>
          {text}
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className={className}>
          {text}
        </Badge>
      );
  }
}

/** The "not yet" chip: a hatched pill (pending, awaiting), the word always beside it. */
export function PendingChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "text-foreground ring-foreground/10 relative inline-flex h-6 w-fit shrink-0 items-center overflow-hidden rounded-full px-2.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        "bg-muted before:hatch before:absolute before:inset-0 before:opacity-70",
        className,
      )}
    >
      <span className="bg-muted/85 relative -mx-1 rounded-full px-1">{children}</span>
    </span>
  );
}
