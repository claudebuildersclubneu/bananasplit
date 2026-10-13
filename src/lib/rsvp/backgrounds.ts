/**
 * The RSVP page's backgrounds (Event.rsvpBackground): flat colours from the
 * brand palette, no gradients. The ids are stored, so they keep their old
 * names: "banana" (the default) is plain cream and "peel" ("Tint") is a soft
 * tint of the club's accent (butter for Bananasplit's own yellow). `tone`
 * says whether the page's own text sits on a light or a dark backdrop; the
 * registration card is always paper, whatever is behind it.
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
  { id: "banana", label: "Cream", tone: "light", swatch: "bg-cream" },
  { id: "cream", label: "Paper", tone: "light", swatch: "bg-paper" },
  { id: "peel", label: "Tint", tone: "light", swatch: "bg-butter" },
  { id: "night", label: "Night", tone: "dark", swatch: "bg-night" },
  { id: "pine", label: "Pine", tone: "dark", swatch: "bg-[#1d3a32]" },
  { id: "brick", label: "Brick", tone: "dark", swatch: "bg-[#5c241f]" },
  { id: "navy", label: "Navy", tone: "dark", swatch: "bg-[#222c4f]" },
  { id: "cover", label: "Cover photo", tone: "dark", swatch: "bg-spot" },
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
