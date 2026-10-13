/**
 * The rules for a new password, shared by sign-up and password reset (NIST
 * SP 800-63B: a length floor, no composition rules). The ceiling is in
 * bytes, not characters: bcrypt reads only the first 72 bytes, so a longer
 * password (or 72 characters of multi-byte text) would be silently cut.
 * Client-safe: no zod here (the schema the actions use is in
 * password-policy.schema.ts).
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export function passwordBytes(password: string): number {
  return new TextEncoder().encode(password).length;
}
