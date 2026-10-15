import { contrastRatio, hexToOklch, isLight, mixOklab, oklchToHex } from "./color";
import { GRAPHIC_TARGET, onFill, readableOn, readableTint, TEXT_TARGET } from "./derive";
import { isHex } from "./hex";
import { DEFAULT_PRESET } from "./presets";
import type { ThemeRoles } from "./types";

/**
 * The brand's yellows, re-derived from a theme's accent.
 *
 * src/app/brand.css names Bananasplit's banana palette as Tailwind colours
 * (bg-banana, bg-butter, text-honey ...). The marketing site and the auth
 * pages keep those fixed yellows. Inside a club (the app shell, the club's
 * public pages, its RSVP pages) the same names are pointed at the club's
 * accent instead, so a green theme gets green highlights, badges and chips
 * rather than Bananasplit yellow:
 *
 * - banana / lemon / gold / ripe: the accent as a fill, and slightly lighter
 *   and deeper variants (hovers, pressed states);
 * - banana-ink: the label on any of those fills (>= 4.5:1 on each);
 * - butter / slice: soft tints of the page towards the accent, with the
 *   theme's text still readable on them;
 * - honey (and -deep, -dark, -hover) / core: the accent as TEXT, nudged in
 *   lightness until it reads on the page, on cards and on butter;
 * - bark / bark-soft: dark text on the tints.
 *
 * Every value is a strict lowercase #rrggbb (css.ts re-checks it at render).
 * Pure and deterministic, like derive.ts.
 */

export const ACCENT_SCALE_NAMES = [
  "banana",
  "banana-ink",
  "lemon",
  "gold",
  "ripe",
  "butter",
  "slice",
  "honey",
  "honey-deep",
  "honey-dark",
  "honey-hover",
  "core",
  "bark",
  "bark-soft",
] as const;

export type AccentScaleName = (typeof ACCENT_SCALE_NAMES)[number];
export type AccentScale = Record<AccentScaleName, string>;

/** brand.css's own values: the Bananasplit preset's light mode keeps them exactly. */
export const BRAND_ACCENT_SCALE: AccentScale = {
  banana: "#f2c230",
  "banana-ink": "#1c1810",
  lemon: "#f7d660",
  gold: "#e9b41c",
  ripe: "#e3a90a",
  butter: "#f6e7b4",
  slice: "#f7ebc4",
  honey: "#7a5a00",
  "honey-deep": "#6b4e00",
  "honey-dark": "#5c4500",
  "honey-hover": "#8a6400",
  core: "#b58a00",
  bark: "#3d2f08",
  "bark-soft": "#4a3a10",
};

/** A fill variant of the accent that keeps `label` readable, else the accent itself. */
function fillVariant(accent: string, towards: string, amount: number, label: string): string {
  const candidate = mixOklab(accent, towards, amount);
  return contrastRatio(label, candidate) >= TEXT_TARGET ? candidate : accent;
}

/**
 * The yellow names for one palette. `roles.background` / `.surface` / `.text`
 * are the grounds the scale must read on; `roles.accent` is the colour.
 */
export function accentScale(roles: ThemeRoles): AccentScale {
  const { accent, background, surface, text } = roles;
  if (
    accent === DEFAULT_PRESET.light.accent &&
    background === DEFAULT_PRESET.light.background &&
    text === DEFAULT_PRESET.light.text
  ) {
    return BRAND_ACCENT_SCALE;
  }
  const dark = !isLight(background);
  const palette = [text, background, surface];

  const bananaInk = onFill(accent, palette);
  // Lighter (hovers) and deeper (pressed, ripe) fills; each falls back to
  // the accent itself where the label would stop reading on it.
  const lemon = fillVariant(accent, "#ffffff", 0.3, bananaInk);
  const gold = fillVariant(accent, "#000000", 0.08, bananaInk);
  const ripe = fillVariant(accent, "#000000", 0.16, bananaInk);

  const butter = readableTint(background, accent, dark ? 0.24 : 0.3, text);
  const slice = readableTint(background, accent, dark ? 0.16 : 0.22, text);

  // Accent-hued text: walk the accent's lightness until it reads on every ground.
  const grounds = [background, surface, butter, slice];
  const honey = readableOn(accent, grounds, TEXT_TARGET);
  const honeyDeep = readableOn(honey, grounds, 5.6);
  const honeyDark = readableOn(honeyDeep, grounds, 6.8);
  const core = readableOn(accent, [background, surface], GRAPHIC_TARGET);

  const a = hexToOklch(accent);
  const barkStart = oklchToHex({ L: dark ? 0.9 : 0.3, C: Math.min(a.C, 0.08), h: a.h });
  const bark = readableOn(barkStart, [butter, slice, background], 7);
  const barkSoft = readableOn(mixOklab(bark, butter, 0.12), [butter, slice, background], 5.5);

  return {
    banana: accent,
    "banana-ink": bananaInk,
    lemon,
    gold,
    ripe,
    butter,
    slice,
    honey,
    "honey-deep": honeyDeep,
    "honey-dark": honeyDark,
    "honey-hover": honeyDeep,
    core,
    bark,
    "bark-soft": barkSoft,
  };
}

/**
 * The dark-mode accent for a light-mode accent: the same hue, lightened
 * until it reads as a highlight on a near-black page (as deriveDarkRoles
 * does for the whole palette).
 */
export function darkAccentFor(accent: string): string {
  const a = hexToOklch(accent);
  return oklchToHex({ L: Math.max(a.L, 0.74), C: Math.min(a.C, 0.18), h: a.h });
}

/**
 * The palettes with Look and feel's accent applied. `accent` null keeps
 * them; otherwise light takes the colour as-is and dark a lightened one.
 */
export function withAccent(
  light: ThemeRoles,
  dark: ThemeRoles,
  accent: string | null,
): { light: ThemeRoles; dark: ThemeRoles } {
  if (!accent || !isHex(accent)) return { light, dark };
  const value = accent.toLowerCase();
  return {
    light: { ...light, accent: value },
    dark: { ...dark, accent: darkAccentFor(value) },
  };
}

function scaleIsValid(scale: unknown): scale is AccentScale {
  if (!scale || typeof scale !== "object") return false;
  const record = scale as Record<string, unknown>;
  return ACCENT_SCALE_NAMES.every((name) => isHex(record[name]));
}

/** `--color-banana:...;...` declarations, or "" when any value is not strict hex. */
function scaleDeclarations(scale: AccentScale): string {
  if (!scaleIsValid(scale)) return "";
  return ACCENT_SCALE_NAMES.map((name) => `--color-${name}:${scale[name].toLowerCase()}`).join(";");
}

/**
 * The accent scale for both modes as a stylesheet: `html:root{...}` and
 * `html.dark{...}`, the same selectors as the token sheet (css.ts), so the
 * brand.css @theme defaults lose to it inside the club and win everywhere
 * else. Fails closed ("") on any bad value.
 */
export function accentStyleSheet(light: ThemeRoles, dark: ThemeRoles): string {
  const l = scaleDeclarations(accentScale(light));
  const d = scaleDeclarations(accentScale(dark));
  if (!l || !d) return "";
  return `html:root{${l}}html.dark{${d}}`;
}

/** The scale as inline custom properties (the scoped preview, the RSVP page). {} on a bad value. */
export function accentScaleStyle(scale: AccentScale): Record<string, string> {
  if (!scaleIsValid(scale)) return {};
  const style: Record<string, string> = {};
  for (const name of ACCENT_SCALE_NAMES) style[`--color-${name}`] = scale[name];
  return style;
}

/** The grounds of Bananasplit's own pages (brand.css): cream paper and ink. */
const BRAND_PAGE: Omit<ThemeRoles, "accent"> = {
  primary: "#1c1810",
  background: "#f7f2e6",
  surface: "#fffdf7",
  text: "#1c1810",
};

/**
 * A club's accent on a brand-styled public page (the RSVP page, its flyer):
 * those pages stay light cream-and-ink, so the scale is derived against the
 * brand's own paper, not the club's background. Also points the .brand
 * scope's --brand-accent / --ring at it (they were resolved on the outer
 * .brand element, so they must be set again where the scale is).
 *
 * {} for no accent or Bananasplit's own banana: the page keeps brand.css.
 */
export function brandPageAccentStyle(accent: string | null | undefined): Record<string, string> {
  if (!accent || !isHex(accent)) return {};
  const value = accent.toLowerCase();
  if (value === BRAND_ACCENT_SCALE.banana) return {};
  const scale = accentScale({ ...BRAND_PAGE, accent: value });
  const style = accentScaleStyle(scale);
  if (!style["--color-banana"]) return {};
  return {
    ...style,
    "--brand-accent": scale.banana,
    "--brand-accent-foreground": scale["banana-ink"],
    "--ring": scale.core,
  };
}
