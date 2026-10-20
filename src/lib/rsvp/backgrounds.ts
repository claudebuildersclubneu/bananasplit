/**
 * The RSVP page's light (Event.rsvpBackground). Moonstone pages sit on the
 * club theme's own ground, so a host doesn't pick a fill: they pick the
 * colour of the glow behind the top of the page (src/app/e/rsvp.css).
 * The ids are stored, so they keep their old names: "banana" (the default)
 * is the theme's own glow, "cream" a faint one, "peel" a bright one and
 * "night" none to speak of. "cover" lights the page with the event's cover,
 * blurred, and falls back to "banana" when there is no cover. Pure and
 * client-safe.
 */

export interface RsvpBackground {
  id: string;
  label: string;
  /** A small preview for the picker (Tailwind classes): the glow on the ground. */
  swatch: string;
}

const ground = "bg-background bg-no-repeat";

export const RSVP_BACKGROUNDS = [
  {
    id: "banana",
    label: "Glow",
    swatch: `${ground} bg-[radial-gradient(circle_at_30%_25%,color-mix(in_oklab,var(--glow)_55%,transparent),transparent_75%)]`,
  },
  {
    id: "cream",
    label: "Soft",
    swatch: `${ground} bg-[radial-gradient(circle_at_30%_25%,color-mix(in_oklab,var(--glow)_22%,transparent),transparent_75%)]`,
  },
  {
    id: "peel",
    label: "Bright",
    swatch: `${ground} bg-[radial-gradient(circle_at_30%_25%,var(--glow),transparent_80%)]`,
  },
  { id: "night", label: "None", swatch: ground },
  {
    id: "pine",
    label: "Pine",
    swatch: `${ground} bg-[radial-gradient(circle_at_30%_25%,#2f9a74,transparent_80%)]`,
  },
  {
    id: "brick",
    label: "Brick",
    swatch: `${ground} bg-[radial-gradient(circle_at_30%_25%,#d0553f,transparent_80%)]`,
  },
  {
    id: "navy",
    label: "Navy",
    swatch: `${ground} bg-[radial-gradient(circle_at_30%_25%,#4a6fd8,transparent_80%)]`,
  },
  { id: "cover", label: "Cover photo", swatch: "bg-muted" },
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
