import "server-only";

import { z } from "zod";

import { CUSTOM_PRESET_ID, findPreset } from "./presets";
import { PERSONAL_MODES } from "./personal";
import { rolesSchema } from "./validate";

/**
 * The checks on a member's personal theme (User.themePreference) the server
 * runs: the setup action's input and every stored read. Apart from
 * ./personal so the theme picker never ships zod to the browser.
 */
export const personalThemeSchema = z
  .object({
    preset: z.string().regex(/^[a-z0-9-]{1,32}$/),
    mode: z.enum(PERSONAL_MODES),
    custom: rolesSchema.nullable().optional(),
  })
  .strict()
  .refine((t) => t.preset === CUSTOM_PRESET_ID || findPreset(t.preset), {
    message: "Pick a theme from the list.",
    path: ["preset"],
  })
  .refine((t) => t.preset !== CUSTOM_PRESET_ID || Boolean(t.custom), {
    message: "Pick your five colours.",
    path: ["custom"],
  })
  .transform((t) => ({
    preset: t.preset,
    mode: t.mode,
    custom: t.preset === CUSTOM_PRESET_ID ? (t.custom ?? null) : null,
  }));

export type PersonalTheme = z.output<typeof personalThemeSchema>;

/** A stored value, or null (follow the org) when missing or malformed. */
export function parsePersonalTheme(raw: unknown): PersonalTheme | null {
  if (!raw) return null;
  const parsed = personalThemeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
