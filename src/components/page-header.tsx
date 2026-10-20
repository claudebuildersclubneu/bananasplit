import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The top of every app page: the title in the display face (and a live
 * one-line summary under it, e.g. "31 open across 5 projects") on the left,
 * the page's actions on the right, and, under both, the page's tabs if it
 * has any. One create (variant="create") action at most; everything else
 * outline or ghost.
 */
export function PageHeader({
  title,
  description,
  actions,
  tabs,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** A <PageTabs> strip under the title row. */
  tabs?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="page-title">{title}</h1>
          {description && <p className="text-muted-foreground mt-2 text-[15px]">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {tabs}
    </header>
  );
}
