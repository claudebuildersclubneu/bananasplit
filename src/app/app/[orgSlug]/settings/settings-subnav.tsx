"use client";

import { Building2, LayoutGrid, Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { SETTINGS_ICONS } from "./settings-icons";
import { isSettingsItemActive, SETTINGS_GROUPS, type SettingsNavItem } from "./settings-nav";

/** A section the club's plan doesn't include (its page offers the upgrade). */
function LockMark({ locked }: { locked?: boolean }) {
  if (!locked) return null;
  return (
    <>
      <Lock className="ms-auto size-3 shrink-0 opacity-60" aria-hidden="true" />
      <span className="sr-only"> (not on your plan)</span>
    </>
  );
}

/**
 * Admin panel navigation: a grouped rail beside the page on wide screens, a
 * scrolling strip of tabs on a phone.
 */
export function SettingsSubnav({ items, orgSlug }: { items: SettingsNavItem[]; orgSlug: string }) {
  const pathname = usePathname();
  const overview = `/app/${orgSlug}/settings`;

  return (
    <nav aria-label="Admin panel">
      <div className="-mx-1 overflow-x-auto px-1 pb-1 lg:hidden">
        <div className="flex min-w-max gap-1.5">
          {items.map((item) => {
            const active = isSettingsItemActive(item, pathname);
            const Icon = SETTINGS_ICONS[item.icon] ?? Building2;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm whitespace-nowrap",
                  active
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {item.label}
                <LockMark locked={item.locked} />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="hidden space-y-5 lg:block">
        <Link
          href={overview}
          aria-current={pathname === overview ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
            pathname === overview
              ? "bg-muted text-foreground font-medium"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          <LayoutGrid className="size-4 shrink-0" aria-hidden="true" />
          Overview
        </Link>
        {SETTINGS_GROUPS.map((group) => {
          const groupItems = items.filter((i) => i.group === group);
          if (groupItems.length === 0) return null;
          return (
            <div key={group} className="space-y-0.5">
              <p className="eyebrow text-muted-foreground px-3 pb-1">{group}</p>
              {groupItems.map((item) => {
                const active = isSettingsItemActive(item, pathname);
                const Icon = SETTINGS_ICONS[item.icon] ?? Building2;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : active ? "true" : undefined}
                    className={cn(
                      "focus-visible:ring-ring flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
                      active
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {item.label}
                    <LockMark locked={item.locked} />
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
