"use client";

import { Check, ChevronsUpDown, KeyRound, LogOut, Plus, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useTransition, type ReactNode } from "react";

import type { OrgSummary } from "@/components/shell/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchActiveOrg } from "@/app/app/actions";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** The org's logo (64px WebP variant), or its initials. Decorative: the name is always next to it. */
export function OrgMark({ org, className = "size-6" }: { org: OrgSummary; className?: string }) {
  if (org.logoUrl) {
    return (
      // Logos are pre-sized WebP variants in the public store; next/image optimization is not used.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={org.logoUrl}
        alt=""
        aria-hidden="true"
        width={24}
        height={24}
        className={`${className} shrink-0 rounded-md object-contain`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${className} bg-muted text-muted-foreground inline-flex shrink-0 items-center justify-center rounded-md text-[10px] font-semibold`}
    >
      {initialsOf(org.name)}
    </span>
  );
}

/**
 * The club menu at the top of the sidebar: the club's logo and name (as its
 * theme says to show them) is the button. It holds what belongs to the club
 * rather than to a page: the Admin panel and invites for owners and admins,
 * leaving for everyone else, and switching, joining or creating a club.
 */
export function OrgSwitcher({
  orgs,
  activeSlug,
  brand,
  isAdmin = false,
  canInvite = false,
}: {
  orgs: OrgSummary[];
  activeSlug: string;
  /** The club's logo and name (OrgBrand); falls back to the mark and name. */
  brand?: ReactNode;
  isAdmin?: boolean;
  canInvite?: boolean;
}) {
  const [, startTransition] = useTransition();
  const live = orgs.filter((o) => !o.pendingDeletion);
  const pending = orgs.filter((o) => o.pendingDeletion);
  const active = live.find((o) => o.slug === activeSlug) ?? live[0] ?? orgs[0];
  const base = `/app/${active.slug}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hover:bg-sidebar-accent focus-visible:ring-ring/50 aria-expanded:bg-sidebar-accent -mx-1 flex min-w-0 items-center justify-between gap-2 rounded-lg p-1.5 text-left transition-colors outline-none focus-visible:ring-3"
          aria-label={`${active.name} menu`}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2.5">
            {brand ?? (
              <>
                <OrgMark org={active} className="size-8" />
                <span className="heading truncate text-[0.95rem]">{active.name}</span>
              </>
            )}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href={`${base}/settings`}>
              <ShieldCheck className="size-4" aria-hidden="true" />
              Admin panel
            </Link>
          </DropdownMenuItem>
        ) : null}
        {canInvite ? (
          <DropdownMenuItem asChild>
            <Link href={`${base}/settings/members`}>
              <UserPlus className="size-4" aria-hidden="true" />
              Invite people
            </Link>
          </DropdownMenuItem>
        ) : null}
        {!isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href={`${base}/settings/members#leave`}>
              <LogOut className="size-4" aria-hidden="true" />
              Leave {active.name}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
          Your clubs
        </DropdownMenuLabel>
        {live.map((org) => (
          <DropdownMenuItem
            key={org.slug}
            onSelect={() => startTransition(() => switchActiveOrg(org.slug))}
          >
            <OrgMark org={org} className="size-5" />
            <span className="flex-1 truncate">{org.name}</span>
            {org.slug === active.slug && <Check className="size-4" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
        {pending.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
              Scheduled for deletion
            </DropdownMenuLabel>
            {pending.map((org) => (
              <DropdownMenuItem key={org.slug} asChild>
                <Link href={`/app/${org.slug}`}>
                  <OrgMark org={org} className="size-5 opacity-50" />
                  <span className="text-muted-foreground flex-1 truncate">{org.name}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding/join">
            <KeyRound className="size-4" aria-hidden="true" />
            Join with invite code
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/onboarding/organization">
            <Plus className="size-4" aria-hidden="true" />
            Create a club
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
