"use client";

import { Pin } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { recordVisitAction, togglePinAction } from "@/app/app/[orgSlug]/_shell/pin-actions";
import { usePins } from "@/components/pins/pins-context";
import { Button } from "@/components/ui/button";
import { canonicalHref } from "@/lib/pins/pages";
import { cn } from "@/lib/utils";

/**
 * The top bar's pin: pins whatever is on screen (a note, a folder, a task, a
 * Tasks board, a database, any page) to the sidebar and the Overview, and
 * unpins it again. Pinning anything else is the sidebar's + under Pinned.
 */
export function PinButton() {
  const pins = usePins();
  const pathname = usePathname().replace(/\/+$/, "");
  const search = useSearchParams().toString();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!pins) return null;
  const address = search ? `${pathname}?${search}` : pathname;
  const href = canonicalHref(pins.orgSlug, address);
  const pinned = href ? pins.pinned.has(href) : false;
  // The Overview is where pins show; pinning it would only point at itself.
  if (!href || href === `/app/${pins.orgSlug}`) return null;
  const label = pinned ? "Unpin this page" : "Pin this page";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-pressed={pinned}
      aria-label={label}
      disabled={pending}
      title={error ?? (pinned ? "Unpin this page" : "Pin this page to your sidebar and Overview")}
      className={cn(pinned && "text-primary")}
      onClick={() =>
        start(async () => {
          setError(null);
          const result = await togglePinAction(pins.orgId, address);
          if (!result.ok) setError(result.error);
          router.refresh();
        })
      }
    >
      <Pin className={cn("size-4", pinned && "fill-current")} aria-hidden="true" />
    </Button>
  );
}

/**
 * Records the page for "Recently visited" once the member has stayed on it
 * for a moment (so clicking through doesn't fill the list).
 */
export function VisitTracker({ orgId }: { orgId: string }) {
  const pathname = usePathname();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (last.current === pathname) return;
    const timer = setTimeout(() => {
      last.current = pathname;
      void recordVisitAction(orgId, pathname).catch(() => undefined);
    }, 1500);
    return () => clearTimeout(timer);
  }, [orgId, pathname]);
  return null;
}
