import { deriveDarkRoles, deriveTheme } from "./derive";
import type { PersonalTheme } from "./personal.schema";
import { CUSTOM_PRESET_ID, DEFAULT_PRESET_ID, findPreset } from "./presets";
import type { ResolvedTheme } from "./resolve";
import { parseRoles } from "./roles";
import type { ThemeRoles } from "./types";

export type { PersonalTheme } from "./personal.schema";

/**
 * A member's personal theme (onboarding A4, and the profile page). It only
 * changes that member's own view: the org layout swaps the palette for
 * theirs, but an org that LOCKS light or dark keeps its lock.
 *
 * Stored on User.themePreference as { preset, mode, custom? }: a preset id
 * from src/lib/theme/presets.ts or "custom" with five strict-hex colours
 * (the light palette; the dark one is derived). NULL = follow the org.
 *
 * Client-safe (the theme picker uses it): the zod schema and
 * parsePersonalTheme are in ./personal.schema (server only).
 */

export const PERSONAL_MODES = ["light", "dark", "system"] as const;
export type PersonalMode = (typeof PERSONAL_MODES)[number];

/** The light and dark palettes a personal theme stands for. */
export function personalPalettes(
  theme: PersonalTheme,
): { light: ThemeRoles; dark: ThemeRoles } | null {
  if (theme.preset === CUSTOM_PRESET_ID) {
    const light = parseRoles(theme.custom);
    return light ? { light, dark: deriveDarkRoles(light) } : null;
  }
  const preset = findPreset(theme.preset);
  return preset ? { light: preset.light, dark: preset.dark } : null;
}

/**
 * The org's resolved theme with the member's palette and mode on top. The
 * org keeps its logo display and any light/dark lock.
 */
export function applyPersonalTheme(
  org: ResolvedTheme,
  personal: PersonalTheme | null,
): ResolvedTheme {
  if (!personal) return org;
  const palettes = personalPalettes(personal);
  if (!palettes) return org;
  const mode = org.lockMode
    ? org.mode
    : personal.mode === "light"
      ? "LIGHT"
      : personal.mode === "dark"
        ? "DARK"
        : "SYSTEM";
  return {
    ...org,
    preset: personal.preset,
    mode,
    light: palettes.light,
    dark: palettes.dark,
    effectiveDark: palettes.dark,
    tokens: deriveTheme(palettes.light, palettes.dark),
    // The default preset is exactly globals.css: nothing to inject.
    isDefault: personal.preset === DEFAULT_PRESET_ID,
  };
}

/** Where "Custom" starts: warm paper with a terracotta primary (custom-builder.ts). */
export const DEFAULT_CUSTOM_ROLES: ThemeRoles = {
  primary: "#b4462b",
  accent: "#e0a23a",
  background: "#faf7f2",
  surface: "#ffffff",
  text: "#1a1512",
};

/** The preview swatches and sample row for one palette (derived tokens). */
export function previewTokens(
  palettes: { light: ThemeRoles; dark: ThemeRoles },
  mode: "light" | "dark",
) {
  const derived = deriveTheme(palettes.light, palettes.dark);
  const t = mode === "light" ? derived.light : derived.dark;
  return {
    page: t.background,
    surface: t.card,
    text: t.foreground,
    muted: t["muted-foreground"],
    primary: t.primary,
    onPrimary: t["primary-foreground"],
    accent: t["brand-accent"],
    border: t.border,
  };
}
