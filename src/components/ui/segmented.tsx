"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The one view switcher (Board / Table, Month / Week, Grid / List...): a
 * muted track with the chosen option raised onto the page colour. Options
 * are links (`href`) or buttons (`onSelect`). Same height as a small button
 * (h-7), like every control in a page header or toolbar.
 */
export interface SegmentedOption {
  value: string;
  label: ReactNode;
  icon?: LucideIcon;
  href?: string;
  /** Hide the label below `sm`, keeping the icon (and the label for screen readers). */
  compact?: boolean;
  title?: string;
}

export const segmentedTrack = "bg-muted inline-flex h-7 items-center gap-0.5 rounded-lg p-0.5";

export function segmentedItem(active: boolean) {
  return cn(
    "focus-visible:ring-ring/50 inline-flex h-6 items-center gap-1.5 rounded-md px-2.5 text-[0.8rem] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 [&_svg]:size-3.5 [&_svg]:shrink-0",
    active
      ? "bg-background text-foreground dark:bg-input/60"
      : "text-muted-foreground hover:text-foreground",
  );
}

/**
 * A filter chip (search scopes, calendar categories, "whose tasks"): a
 * small square-cornered toggle, filled with the text colour when on.
 */
export function chipClass(active: boolean) {
  return cn(
    "focus-visible:ring-ring/50 inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3",
    active
      ? "bg-foreground text-background border-transparent"
      : "text-muted-foreground hover:text-foreground hover:bg-muted",
  );
}

export function Segmented({
  options,
  value,
  onSelect,
  label,
  className,
}: {
  options: readonly SegmentedOption[];
  value: string;
  onSelect?: (value: string) => void;
  /** What the group switches, for screen readers ("Layout", "View"). */
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn(segmentedTrack, className)}>
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        const content = (
          <>
            {Icon && <Icon aria-hidden="true" />}
            <span className={cn(o.compact && Icon && "sr-only sm:not-sr-only")}>{o.label}</span>
          </>
        );
        return o.href ? (
          <Link
            key={o.value}
            href={o.href}
            title={o.title}
            aria-current={active ? "page" : undefined}
            className={segmentedItem(active)}
          >
            {content}
          </Link>
        ) : (
          <button
            key={o.value}
            type="button"
            title={o.title}
            aria-pressed={active}
            onClick={() => onSelect?.(o.value)}
            className={segmentedItem(active)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
