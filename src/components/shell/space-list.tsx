"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";

import { switchActiveOrg } from "@/app/app/actions";
import { OrgMark, orderSpaces } from "@/components/shell/org-switcher";
import type { OrgSummary, ShellUser } from "@/components/shell/types";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

/**
 * Personal and every club, always on screen at the foot of the sidebar: one
 * click from a club back to Personal, or across to another club, without
 * opening the menu at the top (docs/features/personal-and-clubs.md,
 * "Switching"). The space you're in is marked; the menu keeps the rest
 * (pending deletion, Start a club).
 */
export function SpaceList({
  orgs,
  activeSlug,
  user,
  onNavigate,
}: {
  orgs: OrgSummary[];
  activeSlug: string;
  user: ShellUser;
  onNavigate?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const spaces = orderSpaces(orgs.filter((o) => !o.pendingDeletion));
  const hasClubs = spaces.some((o) => o.kind !== "PERSONAL");

  return (
    <div aria-busy={pending || undefined}>
      <span className="eyebrow text-sidebar-foreground/60 block px-3 pb-1.5">
        Personal &amp; clubs
      </span>
      <ul className="flex max-h-40 flex-col gap-0.5 overflow-y-auto">
        {spaces.map((org) => {
          const current = org.slug === activeSlug;
          const name = org.kind === "PERSONAL" ? "Personal" : org.name;
          return (
            <li key={org.slug}>
              <Link
                href={`/app/${org.slug}`}
                aria-current={current ? "true" : undefined}
                onClick={(event) => {
                  // A plain click remembers the space (Home opens it next time);
                  // a modified click opens it in a new tab as a link would. The
                  // space you're in just goes to its home page.
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
                    return;
                  }
                  onNavigate?.();
                  if (current) return;
                  event.preventDefault();
                  startTransition(() => switchActiveOrg(org.slug));
                }}
                className={cn(
                  "focus-visible:ring-ring flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  current
                    ? "text-sidebar-foreground font-semibold"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                {org.kind === "PERSONAL" ? (
                  <UserAvatar user={user} size="xs" className="shrink-0" />
                ) : (
                  <OrgMark org={org} className="size-5" />
                )}
                <span className="min-w-0 flex-1 truncate">{name}</span>
                {current && (
                  <>
                    <span
                      className="bg-sidebar-primary size-1.5 shrink-0 rounded-full"
                      aria-hidden="true"
                    />
                    <span className="sr-only"> (you&apos;re here)</span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
        {!hasClubs && (
          <li>
            <Link
              href="/onboarding/join"
              onClick={onNavigate}
              className="text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-ring flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <KeyRound className="size-4 shrink-0" aria-hidden="true" />
              Join a club
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}
