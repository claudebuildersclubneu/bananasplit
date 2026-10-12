import { ChevronLeft } from "lucide-react";
import Link from "next/link";

/**
 * The way back up from a detail page (a task, an event, a poll, a file, a
 * database), above its title: the parent's name after a chevron, the same
 * on every page.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
    >
      <ChevronLeft className="size-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
