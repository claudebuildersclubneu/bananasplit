"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { segmentedItem, segmentedTrack } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";

/**
 * The one way a section splits into pages (Finance's pages, Databases and
 * Reports, People's directory and org chart): the same switch bar Tasks uses
 * for its layouts, so every set of tabs in the app looks and works alike.
 * A tab is active on its own URL, or on anything below it unless `exact`;
 * pass `active` to decide yourself.
 */
export interface PageTab {
  href: string;
  label: string;
  icon?: LucideIcon;
  exact?: boolean;
  active?: boolean;
}

export function PageTabs({
  tabs,
  label,
  className,
}: {
  tabs: readonly PageTab[];
  label: string;
  className?: string;
}) {
  const pathname = usePathname() ?? "";
  const isActive = (t: PageTab) => {
    if (t.active !== undefined) return t.active;
    if (pathname === t.href) return true;
    if (t.exact) return false;
    // The most specific tab wins (Dashboard at /finance vs /finance/budget).
    return (
      pathname.startsWith(`${t.href}/`) &&
      !tabs.some(
        (o) =>
          o.href.length > t.href.length &&
          (pathname === o.href || pathname.startsWith(`${o.href}/`)),
      )
    );
  };

  return (
    <nav aria-label={label} className={cn("max-w-full overflow-x-auto", className)}>
      <ul className={cn(segmentedTrack, "min-w-max")}>
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={segmentedItem(active)}
              >
                {Icon && <Icon aria-hidden="true" />}
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
