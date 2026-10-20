"use client";

import type { ReactNode } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { useViewParams } from "./view-params";

/**
 * The row detail drawer (?row=id). The server page loads the row through the
 * same RLS-scoped transaction as the table and passes the rendered detail as
 * children; closing the drawer removes ?row= from the URL.
 */
export function RowDrawer({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const view = useViewParams();
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) view.update((p) => p.delete("row"), { keepPage: true });
      }}
    >
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader className="gap-1 px-6 pt-6 pr-14 pb-5">
          <SheetTitle className="text-[19px]">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="space-y-7 px-6 pb-8">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
