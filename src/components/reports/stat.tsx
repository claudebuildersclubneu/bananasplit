import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A stat tile inside a report card (Moonstone: an inset tile, no border):
 * a plain label, the value as a big tabular numeral, an optional detail
 * line. With `href` the whole tile links to the rows behind the number.
 * (A page-level row of numbers is the StatStrip in ui/stat instead.)
 */
export function Stat({
  label,
  value,
  detail,
  href,
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  href?: string | null;
  className?: string;
}) {
  const body = (
    <>
      <span className="text-muted-foreground text-[13px]">{label}</span>
      <span className="numeral mt-1.5 text-[26px]">{value}</span>
      {detail ? (
        <span className="text-muted-foreground mt-1 text-xs leading-snug">{detail}</span>
      ) : null}
    </>
  );
  const base = "rounded-tile bg-muted/50 flex min-w-0 flex-col px-4 py-3.5";
  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          base,
          "hover:bg-muted focus-glow transition-[background-color,transform] duration-200 ease-(--ease-ink) outline-none hover:-translate-y-0.5 motion-reduce:transform-none",
          className,
        )}
      >
        {body}
      </Link>
    );
  }
  return <div className={cn(base, className)}>{body}</div>;
}

export function StatRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3", className)}>{children}</div>;
}
