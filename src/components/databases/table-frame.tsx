import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The one table style (Moonstone, guide 7.11), around the shared <Table>:
 * a surface card with a 10px inset, the rounded header band, no vertical
 * lines, and a sticky header. The header sticks inside the table's own
 * scroll box (it scrolls sideways on a phone anyway), so long tables get a
 * max height (`maxHeight`, 70vh by default) and scroll inside it.
 *
 * Numbers go right-aligned and tabular: `className="text-right tabular-nums"`
 * on both the TableHead and the TableCell. A selected row is
 * `data-state="selected"` on the TableRow (the glow tint).
 *
 * `bare` drops the card (for a table that already sits in a card or widget)
 * and keeps the sticky header.
 */
export function TableFrame({
  children,
  className,
  maxHeight = "70vh",
  bare = false,
}: {
  children: ReactNode;
  className?: string;
  /** Any CSS length, or "none" to let the table grow with the page. */
  maxHeight?: string;
  bare?: boolean;
}) {
  return (
    <div
      style={{ "--table-max": maxHeight } as CSSProperties}
      className={cn(
        !bare && "bg-card text-card-foreground ring-foreground/6 edge rounded-card p-2.5 ring-1",
        // The shared Table's own scroll box: cap its height so the header can stick.
        "[&_[data-slot=table-container]]:max-h-(--table-max) [&_[data-slot=table-container]]:overflow-auto",
        // An opaque header band (muted at 70% over the card), so rows pass under it.
        "[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-[color-mix(in_oklab,var(--muted)_70%,var(--card))]",
        className,
      )}
    >
      {children}
    </div>
  );
}
