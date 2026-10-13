import { normalizeHex } from "./hex";
import { ROLE_KEYS, type ThemeRoles } from "./types";

/**
 * Reads a stored palette (OrgTheme.light / .dark JSON). Every role must be
 * present and strict hex; anything else returns null so the caller falls
 * back (to the default theme, or to the derived dark palette). Zod-free, so
 * the theme preview and picker in the browser can use it.
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
