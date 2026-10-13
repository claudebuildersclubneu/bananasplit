import "server-only";

import { z } from "zod";

import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH, passwordBytes } from "./password-policy";

/**
 * The new-password check the sign-up and reset actions run. Kept apart from
 * password-policy.ts so the forms, which only need the numbers, never pull
 * zod into the browser.
 */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .refine((p) => passwordBytes(p) <= PASSWORD_MAX_BYTES, {
    message:
      "That password is too long. Keep it under 72 characters (fewer with emoji or accents).",
  });
