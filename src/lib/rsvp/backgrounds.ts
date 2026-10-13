/**
 * The RSVP page's backgrounds (Event.rsvpBackground), all from the brand
 * palette. `tone` says whether the page's own text sits on a light or a dark
 * backdrop; the registration card is always paper, whatever is behind it.
 * "cover" blurs the event's cover image behind the page, and falls back to
 * "banana" when there is no cover. Pure and client-safe.
 */

export interface RsvpBackground {
  id: string;
  label: string;
  tone: "light" | "dark";
  /** A small preview for the picker (Tailwind classes). */
  swatch: string;
}

export const RSVP_BACKGROUNDS = [
  { id: "banana", label: "Banana", tone: "light", swatch: "bg-linear-to-b from-cream to-banana" },
  { id: "cream", label: "Cream", tone: "light", swatch: "bg-cream" },
  { id: "peel", label: "Peel", tone: "light", swatch: "bg-linear-to-br from-lemon to-gold" },
  { id: "night", label: "Night", tone: "dark", swatch: "bg-linear-to-br from-night to-stem" },
  { id: "pine", label: "Pine", tone: "dark", swatch: "bg-linear-to-br from-pine to-night" },
  { id: "brick", label: "Brick", tone: "dark", swatch: "bg-linear-to-br from-brick to-night" },
  { id: "navy", label: "Navy", tone: "dark", swatch: "bg-linear-to-br from-navy to-night" },
  { id: "cover", label: "Cover photo", tone: "dark", swatch: "bg-linear-to-br from-wheat to-spot" },
] as const satisfies readonly RsvpBackground[];

export type RsvpBackgroundId = (typeof RSVP_BACKGROUNDS)[number]["id"];

export const DEFAULT_RSVP_BACKGROUND: RsvpBackgroundId = "banana";

export function isRsvpBackground(value: unknown): value is RsvpBackgroundId {
  return RSVP_BACKGROUNDS.some((b) => b.id === value);
}

/** The background to draw: "cover" without a cover image is the default. */
export function resolveRsvpBackground(value: unknown, hasCover: boolean): RsvpBackground {
  const id =
    isRsvpBackground(value) && (value !== "cover" || hasCover) ? value : DEFAULT_RSVP_BACKGROUND;
  return RSVP_BACKGROUNDS.find((b) => b.id === id)!;
}
