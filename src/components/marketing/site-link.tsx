import Link from "next/link";

/**
 * A link to an app route (next/link, so it prefetches) or to anything else:
 * a section of this page, or one of the placeholder destinations in
 * @/lib/brand/links, which may turn into a mailto or another site.
 */
export function SiteLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return href.startsWith("/") ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
