"use client";

import { Ellipsis, FileText } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { CreateMenu } from "@/components/shell/create-menu";
import {
  isExactPage,
  isLinkActive,
  type CreateAction,
  type NavLink,
  type NavSection,
  tabBarLinks,
} from "@/components/shell/nav-config";
import { ICON_STROKE, NAV_ICONS } from "@/components/shell/sidebar-nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tabClass = cn(
  "focus-glow flex min-w-0 flex-1 flex-col items-center gap-[3px] rounded-full px-2 py-1.5 text-xs font-semibold outline-none",
  "text-chrome-foreground/65 transition-[background-color,color,scale] duration-150 active:scale-[0.94] motion-reduce:transition-none motion-reduce:active:scale-100",
  "hover:text-chrome-foreground aria-[current]:bg-chrome-foreground/12 aria-[current]:text-chrome-foreground",
);

function Tab({
  link,
  pathname,
  search,
  all,
}: {
  link: NavLink;
  pathname: string;
  search: string;
  all: readonly NavLink[];
}) {
  const Icon = NAV_ICONS[link.icon] ?? FileText;
  const active = isLinkActive(link, pathname, all, search);
  return (
    <Link
      href={link.href}
      aria-current={isExactPage(link.href, pathname, search) ? "page" : active ? "true" : undefined}
      className={tabClass}
    >
      <Icon className="size-[21px] shrink-0" strokeWidth={ICON_STROKE} aria-hidden="true" />
      <span className="max-w-full truncate">{link.label}</span>
    </Link>
  );
}

/**
 * The phone's navigation, in place of the sidebar below md: a glass bar
 * floating over the bottom of the page (clear of the home indicator) with
 * the space's home (Overview, or Home in Personal), Tasks, the create
 * button, Calendar, and More, which opens the whole sidebar in a sheet. A
 * section the space hides or its plan lacks just isn't there.
 */
export function TabBar({
  orgId,
  orgSlug,
  sections,
  createActions,
  moreOpen,
  onMore,
}: {
  orgId: string;
  orgSlug: string;
  sections: readonly NavSection[];
  createActions: readonly CreateAction[];
  moreOpen: boolean;
  onMore: () => void;
}) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const all = sections.flatMap((s) => s.items);
  const { home, tasks, calendar } = tabBarLinks(sections);
  const tab = (link: NavLink | undefined) =>
    link && <Tab link={link} pathname={pathname} search={search} all={all} />;

  return (
    <nav
      aria-label="Tab bar"
      className="glass fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-[26rem] items-center justify-around gap-0.5 rounded-full p-[7px] md:hidden"
    >
      {tab(home)}
      {tab(tasks)}
      {createActions.length > 0 && (
        <CreateMenu
          orgId={orgId}
          orgSlug={orgSlug}
          actions={createActions}
          side="top"
          align="center"
        >
          {({ pending, icon }) => (
            <Button
              variant="create"
              size="icon"
              aria-label="Create"
              aria-busy={pending || undefined}
              className="mx-1 size-12 motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:size-6"
            >
              {icon}
            </Button>
          )}
        </CreateMenu>
      )}
      {tab(calendar)}
      <button
        type="button"
        onClick={onMore}
        aria-haspopup="dialog"
        aria-expanded={moreOpen}
        className={cn(tabClass, "aria-expanded:bg-chrome-foreground/12 aria-expanded:text-chrome-foreground")}
      >
        <Ellipsis className="size-[21px] shrink-0" strokeWidth={ICON_STROKE} aria-hidden="true" />
        More
      </button>
    </nav>
  );
}
