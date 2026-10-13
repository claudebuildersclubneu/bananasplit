import { cn } from "@/lib/utils";

/**
 * A small Instagram glyph linking to someone's profile (guest list, Hosted
 * by). Drawn here: the icon set has no brand marks.
 */
export function InstagramLink({
  url,
  name,
  className,
}: {
  url: string;
  /** Whose profile, for the link's accessible name. */
  name: string;
  className?: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      aria-label={`${name} on Instagram`}
      title={`${name} on Instagram`}
      className={cn(
        "inline-grid size-7 flex-none place-items-center rounded-full text-(--rsvp-soft) hover:bg-(--rsvp-tile) hover:text-(--rsvp-fg)",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
      </svg>
    </a>
  );
}
