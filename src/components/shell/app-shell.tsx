"use client";

import { Menu, Search } from "lucide-react";
import { useEffect, useState } from "react";

import type { PaletteSection } from "@/components/command-palette/catalog";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { useModKey } from "@/components/command-palette/use-mod-key";
import { NotificationBell } from "@/components/shell/notification-bell";
import { OrgSwitcher } from "@/components/shell/org-switcher";
import { PinsProvider } from "@/components/pins/pins-context";
import { PinButton, VisitTracker } from "@/components/shell/pin-button";
import type { NavSection } from "@/components/shell/nav-config";
import { SectionGate } from "@/components/shell/section-gate";
import { SidebarNav, type SidebarPin } from "@/components/shell/sidebar-nav";
import { UserMenu } from "@/components/shell/user-menu";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { OrgSummary, ShellUser } from "@/components/shell/types";
import type { Role } from "@/generated/prisma/enums";

export function AppShell({
  orgSlug,
  orgId,
  orgs,
  user,
  brand,
  pins = [],
  sections,
  sectionPaths = [],
  role = null,
  isAdmin = false,
  canInvite = false,
  children,
}: {
  orgSlug: string;
  orgId: string;
  orgs: OrgSummary[];
  user: ShellUser;
  /** The org's logo and name (Admin panel › Theme › Logo display): the club menu's face. */
  brand?: React.ReactNode;
  /** The member's pins in this org (sidebar, and the pin button's state). */
  pins?: SidebarPin[];
  /** The org's sidebar (Admin panel › Sidebar). */
  sections: NavSection[];
  /**
   * Every section (path, name, icon) and whether the org turned it off:
   * members see a notice there, and search leaves it out for them.
   */
  sectionPaths?: PaletteSection[];
  /** The member's role in this org (what search may show them). */
  role?: Role | null;
  isAdmin?: boolean;
  /** May invite members (the club menu's "Invite people"). */
  canInvite?: boolean;
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Each opening is a new session (a fresh palette: empty box, no stale results).
  const [command, setCommand] = useState({ open: false, session: 0 });
  const setCommandOpen = (open: boolean) =>
    setCommand((c) => (open === c.open ? c : { open, session: open ? c.session + 1 : c.session }));
  const mod = useModKey();
  const clubMenu = (
    <OrgSwitcher
      orgs={orgs}
      activeSlug={orgSlug}
      brand={brand}
      isAdmin={isAdmin}
      canInvite={canInvite}
    />
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommand((c) => ({ open: !c.open, session: c.open ? c.session : c.session + 1 }));
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <PinsProvider orgId={orgId} orgSlug={orgSlug} pinnedHrefs={pins.map((p) => p.href)}>
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[16rem_1fr]">
        <a
          href="#main-content"
          className="bg-background text-foreground focus:ring-ring sr-only rounded-md px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:ring-2"
        >
          Skip to content
        </a>

        <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden flex-col gap-3 border-r p-3 md:sticky md:top-0 md:flex md:h-screen">
          {clubMenu}
          <SidebarNav sections={sections} orgId={orgId} pins={pins} />
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-4 backdrop-blur md:px-6">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="bg-sidebar text-sidebar-foreground flex w-72 flex-col p-3"
              >
                <SheetHeader className="gap-3 p-0 pr-8">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  {clubMenu}
                </SheetHeader>
                <div className="mt-3 flex min-h-0 flex-1 flex-col">
                  <SidebarNav
                    sections={sections}
                    orgId={orgId}
                    pins={pins}
                    onNavigate={() => setMobileNavOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>

            {/* Looks like the search boxes on every page, and opens search everywhere. */}
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              aria-label="Search everything"
              className="border-input text-muted-foreground hover:text-foreground hover:border-foreground/20 focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 flex h-8 w-full max-w-sm min-w-0 items-center gap-2 rounded-lg border bg-transparent px-2.5 text-sm transition-colors outline-none focus-visible:ring-3"
            >
              <Search className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">Search everything</span>
              <kbd className="ms-auto hidden rounded-md border px-1 font-sans text-[10px] leading-4 sm:block">
                {mod === "⌘" ? "⌘K" : "Ctrl K"}
              </kbd>
            </button>

            <div className="flex flex-1 items-center justify-end gap-1">
              <PinButton />
              <NotificationBell />
              <UserMenu user={user} />
            </div>
          </header>

          <main
            id="main-content"
            className="reveal-page relative isolate min-w-0 flex-1 p-4 md:p-6"
          >
            <SectionGate orgSlug={orgSlug} sectionPaths={sectionPaths} isAdmin={isAdmin}>
              {children}
            </SectionGate>
          </main>
        </div>

        <VisitTracker orgId={orgId} />
        <CommandPalette
          key={command.session}
          orgId={orgId}
          orgSlug={orgSlug}
          role={role}
          sections={sectionPaths}
          orgs={orgs}
          open={command.open}
          onOpenChange={setCommandOpen}
        />
        <Toaster />
      </div>
    </PinsProvider>
  );
}
