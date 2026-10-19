"use client";

import { Building2, LayoutGrid, Lock, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Card } from "@/components/ui/card";
import { chipClass } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";

import { SETTINGS_ICONS } from "./settings-icons";
import { isSettingsItemActive, SETTINGS_GROUPS, type SettingsNavItem } from "./settings-nav";

/** A section the club's plan doesn't include (its page offers the upgrade). */
function LockMark({ locked }: { locked?: boolean }) {
  if (!locked) return null;
  return (
    <>
      <Lock className="ms-auto size-3.5 shrink-0 opacity-60" aria-hidden="true" />
      <span className="sr-only"> (not on your plan)</span>
    </>
  );
}

/** One row of the list: icon and name, a filled pill when it's the open page. */
function NavRow({
  href,
  label,
  icon: Icon,
  active,
  current,
  locked,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  /** aria-current: "page" on the item's own URL, "true" on a page below it. */
  current?: "page" | "true";
  locked?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={current}
      className={cn(
        "rounded-field focus-visible:outline-foreground flex h-10 items-center gap-3 px-3 text-sm transition-colors outline-none focus-visible:outline-2 focus-visible:-outline-offset-2",
        active
          ? "bg-muted text-foreground font-semibold"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium",
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{label}</span>
      <LockMark locked={locked} />
    </Link>
  );
}

/**
 * Admin panel navigation: a grouped list in a card beside the page on wide
 * screens (the open page a filled pill), a scrolling strip of pills on a
 * phone.
 */
export function SettingsSubnav({
  items,
  orgSlug,
  personal = false,
}: {
  items: SettingsNavItem[];
  orgSlug: string;
  /** A Personal space: the overview is "Settings", not "Admin panel". */
  personal?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const overview = `/app/${orgSlug}/settings`;
  const onOverview = pathname === overview;

  return (
    <nav aria-label="Admin panel">
      {/* Phone and tablet: one scrolling row of pills, the open page filled. */}
      <div className="-mx-4 [scrollbar-width:none] overflow-x-auto px-4 pb-1 lg:hidden">
        <ul className="flex min-w-max gap-2">
          <li>
            <Link
              href={overview}
              aria-current={onOverview ? "page" : undefined}
              className={chipClass(onOverview)}
            >
              <LayoutGrid aria-hidden="true" />
              Overview
            </Link>
          </li>
          {items.map((item) => {
            const active = isSettingsItemActive(item, pathname);
            const Icon = SETTINGS_ICONS[item.icon] ?? Building2;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={chipClass(active)}
                >
                  <Icon aria-hidden="true" />
                  {item.label}
                  <LockMark locked={item.locked} />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Wide screens: the grouped list in a card. */}
      <Card className="hidden gap-4 p-3 lg:flex">
        <NavRow
          href={overview}
          label={personal ? "Settings" : "Overview"}
          icon={LayoutGrid}
          active={onOverview}
          current={onOverview ? "page" : undefined}
        />
        {SETTINGS_GROUPS.map((group) => {
          const groupItems = items.filter((i) => i.group === group);
          if (groupItems.length === 0) return null;
          return (
            <div key={group} className="space-y-0.5">
              <p className="eyebrow text-muted-foreground px-3 pb-1">{group}</p>
              {groupItems.map((item) => {
                const active = isSettingsItemActive(item, pathname);
                return (
                  <NavRow
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={SETTINGS_ICONS[item.icon] ?? Building2}
                    active={active}
                    current={pathname === item.href ? "page" : active ? "true" : undefined}
                    locked={item.locked}
                  />
                );
              })}
            </div>
          );
        })}
      </Card>
    </nav>
  );
}
