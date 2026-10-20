"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { chipClass } from "@/components/ui/segmented";

/**
 * A filter pill that is a link (the audit log's groups, the profile's
 * section jumps), for server pages: chipClass lives in a client module.
 * `active` fills it and marks it the current page.
 */
export function ChipLink({
  href,
  active = false,
  children,
}: {
  href: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={chipClass(active)}>
      {children}
    </Link>
  );
}
