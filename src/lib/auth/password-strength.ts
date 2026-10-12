import { PASSWORD_MIN_LENGTH } from "./password-policy";

/**
 * The three-segment meter on the sign-up and reset forms. A rough guide for
 * the person typing, not a rule: the server enforces password-policy.ts.
 */

export interface PasswordStrength {
  /** Segments filled, 0-3. */
  score: 0 | 1 | 2 | 3;
  label: "" | "Too short" | "Weak" | "Good" | "Strong";
}

export function passwordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "" };
  if (password.length < PASSWORD_MIN_LENGTH) return { score: 1, label: "Too short" };
  const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) =>
    re.test(password),
  ).length;
  if (password.length >= 12 && kinds >= 3) return { score: 3, label: "Strong" };
  if (password.length >= 10 || kinds >= 3) return { score: 2, label: "Good" };
  return { score: 1, label: "Weak" };
}
