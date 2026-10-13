import { z } from "zod";

import { HEX_RE } from "./hex";
import { LOGO_DISPLAYS, THEME_MODES } from "./types";

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
  })
  .strict();

export type ThemeInput = z.infer<typeof themeInputSchema>;

/** Reading a stored palette is in ./roles (zod-free, for client code); re-exported here. */
export { parseRoles } from "./roles";
