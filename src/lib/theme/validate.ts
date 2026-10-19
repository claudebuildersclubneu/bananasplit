import { z } from "zod";

import { HEX_RE, normalizeHex } from "./hex";
import {
  BODY_FONT_OPTIONS,
  DEFAULT_THEME_STYLE,
  HEADING_FONT_OPTIONS,
  RADIUS_OPTIONS,
  TEXT_SIZE_OPTIONS,
} from "./style";
import { LOGO_DISPLAYS, ROLE_KEYS, THEME_MODES, type ThemeRoles } from "./types";

/** Strict hex lives in ./hex (zod-free, for client code); re-exported here. */
export { HEX_RE, isHex, normalizeHex } from "./hex";

export const hexSchema = z
  .string()
  .regex(HEX_RE, "Use a six-digit hex colour like #a34a2a.")
  .transform((value) => value.toLowerCase());

export const rolesSchema = z
  .object({
    primary: hexSchema,
    accent: hexSchema,
    background: hexSchema,
    surface: hexSchema,
    text: hexSchema,
  })
  .strict();

/** Preset ids: a short slug. Unknown ids are stored as "custom" by the action. */
export const presetIdSchema = z.string().regex(/^[a-z0-9-]{1,32}$/);

/**
 * Look and feel (src/lib/theme/style.ts). Every field has a default, and the
 * whole object is optional on the input, so a client (or a stored value)
 * from before these options parses as the default look.
 */
export const themeStyleSchema = z
  .object({
    accent: hexSchema.nullable().default(DEFAULT_THEME_STYLE.accent),
    glow: hexSchema.nullable().default(DEFAULT_THEME_STYLE.glow),
    radius: z.enum(RADIUS_OPTIONS).default(DEFAULT_THEME_STYLE.radius),
    textSize: z.enum(TEXT_SIZE_OPTIONS).default(DEFAULT_THEME_STYLE.textSize),
    headingFont: z.enum(HEADING_FONT_OPTIONS).default(DEFAULT_THEME_STYLE.headingFont),
    bodyFont: z.enum(BODY_FONT_OPTIONS).default(DEFAULT_THEME_STYLE.bodyFont),
  })
  .strict();

/** What Settings > Theme submits. */
export const themeInputSchema = z
  .object({
    preset: presetIdSchema,
    mode: z.enum(THEME_MODES),
    lockMode: z.boolean(),
    logoDisplay: z.enum(LOGO_DISPLAYS),
    light: rolesSchema,
    /** null = derive the dark palette from the light one. */
    dark: rolesSchema.nullable(),
    /** Missing = the default look (clients from before Look and feel). */
    style: themeStyleSchema.default({ ...DEFAULT_THEME_STYLE }),
  })
  .strict();

export type ThemeInput = z.infer<typeof themeInputSchema>;

/**
 * Reads a stored palette (OrgTheme.light / .dark JSON). Every role must be
 * present and strict hex; anything else returns null so the caller falls
 * back (to the default theme, or to the derived dark palette).
 */
export function parseRoles(value: unknown): ThemeRoles | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const roles = {} as ThemeRoles;
  for (const key of ROLE_KEYS) {
    const hex = normalizeHex(record[key]);
    if (!hex) return null;
    roles[key] = hex;
  }
  return roles;
}
