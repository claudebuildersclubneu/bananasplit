/**
 * The profile fields' limits. Zod-free so the forms can set maxLength in the
 * browser; the schemas that enforce them are in ./schema (server only).
 */
export const PROFILE_LIMITS = {
  name: 80,
  pronouns: 40,
  major: 80,
  bio: 1000,
  gradYearMin: 1950,
  gradYearMax: 2100,
} as const;
