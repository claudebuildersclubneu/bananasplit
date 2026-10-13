import { z } from "zod";

import { MAX_LINKS, type LinkKind } from "@/lib/profile/links";
import { profileDetailsSchema, profileLinkSchema } from "@/lib/profile/schema";

/**
 * The two onboarding flows from the design (docs/features/onboarding-flows.md):
 *
 *   A  Profile setup, in two parts:
 *      A1 basics, the quick profile everyone fills in right after sign-up
 *      (name, photo, pronouns, time zone); it alone completes onboarding,
 *      then A7: join with a code, or create a club (Flow B).
 *      The club profile, optional and separate: A2 school -> A3 bio ->
 *      A4 theme -> A5 availability -> A6 review.
 *   B  Create an organization, only for the person creating one:
 *      B1 name -> B2 data -> B3 labels -> B4 finance -> B5 teams -> B6 invite
 *      -> the org, as admin.
 *
 * Pure and client-safe: the pages, forms and actions share these.
 */

export const PROFILE_STEPS = [
  "basics",
  "school",
  "bio",
  "theme",
  "availability",
  "review",
] as const;
export type ProfileStep = (typeof PROFILE_STEPS)[number];

/** The quick profile: one page, for everyone. */
export const QUICK_PROFILE_STEP = "basics" satisfies ProfileStep;
/** The club profile: what teammates in a club see, set up separately. */
export const CLUB_PROFILE_STEPS = ["school", "bio", "theme", "availability", "review"] as const;

export const PROFILE_STEP_TITLES: Record<ProfileStep, string> = {
  basics: "About you",
  school: "School and role",
  bio: "Bio and links",
  theme: "Pick a theme",
  availability: "When can't you meet?",
  review: "Review",
};

export function isProfileStep(value: unknown): value is ProfileStep {
  return typeof value === "string" && (PROFILE_STEPS as readonly string[]).includes(value);
}

export function profileStepHref(step: ProfileStep): string {
  return `/onboarding/profile/${step}`;
}

/** The quick profile and the club profile are separate runs: neither leads into the other. */
export function nextProfileStep(step: ProfileStep): ProfileStep | null {
  if (step === QUICK_PROFILE_STEP) return null;
  const i = (CLUB_PROFILE_STEPS as readonly ProfileStep[]).indexOf(step);
  return CLUB_PROFILE_STEPS[i + 1] ?? null;
}

export function previousProfileStep(step: ProfileStep): ProfileStep | null {
  if (step === QUICK_PROFILE_STEP) return null;
  const i = (CLUB_PROFILE_STEPS as readonly ProfileStep[]).indexOf(step);
  return i > 0 ? CLUB_PROFILE_STEPS[i - 1] : null;
}

// B1 is /onboarding/organization; the rest live under the new org's slug.
export const ORG_STEPS = ["data", "labels", "finance", "teams", "invite"] as const;
export type OrgStep = (typeof ORG_STEPS)[number];
/** Six steps in the stepper: B1 plus these five. */
export const ORG_STEP_COUNT = ORG_STEPS.length + 1;

/** The stepper's names for B1-B6, in order. */
export const ORG_STEP_NAMES = [
  "Club basics",
  // Optional: a club's data is stored in Bananasplit whether or not it connects anything.
  "Connect tools",
  "Labels",
  "Finance",
  "Teams",
  "Invite officers",
] as const;

export function isOrgStep(value: unknown): value is OrgStep {
  return typeof value === "string" && (ORG_STEPS as readonly string[]).includes(value);
}

export function orgStepHref(orgSlug: string, step: OrgStep): string {
  return `/onboarding/organization/${orgSlug}/${step}`;
}

export function nextOrgStep(step: OrgStep): OrgStep | null {
  return ORG_STEPS[ORG_STEPS.indexOf(step) + 1] ?? null;
}

export function previousOrgStep(step: OrgStep): OrgStep | null {
  const i = ORG_STEPS.indexOf(step);
  return i > 0 ? ORG_STEPS[i - 1] : null;
}

// ---------------------------------------------------------------- A1-A3 input

export const PRONOUN_CHOICES = ["he/him", "she/her", "they/them"] as const;

/** The role picker in A2. Stored as the title for the orgs the user joins. */
export const ROLE_CHOICES = [
  "President",
  "Vice President",
  "Treasurer",
  "Secretary",
  "Project Manager",
  "Developer",
  "Designer",
  "Marketing",
  "Events",
  "Outreach",
  "Member",
] as const;

export const MAX_TITLE = 80;
/** The bio box in setup is short on purpose; the profile page allows more. */
export const SETUP_BIO_MAX = 280;

const { name, pronouns, timezone, major, gradYear, bio } = profileDetailsSchema.shape;

export const basicsSchema = z.object({ name, pronouns, timezone }).strict();

export const schoolSchema = z
  .object({
    major,
    gradYear,
    preferredTitle: z
      .string()
      .transform((s) => s.replace(/\s+/g, " ").trim())
      .pipe(z.string().max(MAX_TITLE, `Keep your role under ${MAX_TITLE} characters.`))
      .transform((s) => (s ? s : null))
      .nullable()
      .optional()
      .transform((v) => v ?? null),
  })
  .strict();

export const bioSchema = z
  .object({
    bio,
    links: z
      .array(profileLinkSchema)
      .max(MAX_LINKS, `Add at most ${MAX_LINKS} links.`)
      .optional()
      .transform((v) => v ?? []),
  })
  .strict();

/** A1-A3 inputs, for the forms. */
export type BasicsInput = z.input<typeof basicsSchema>;
export type SchoolInput = z.input<typeof schoolSchema>;
export type BioInput = z.input<typeof bioSchema>;

/** "Computer Science, Mathematics" <-> ["Computer Science", "Mathematics"] */
export const MAJOR_SEPARATOR = ", ";

export function splitMajor(major: string | null): [string, string] {
  if (!major) return ["", ""];
  const i = major.indexOf(MAJOR_SEPARATOR);
  return i < 0 ? [major, ""] : [major.slice(0, i), major.slice(i + MAJOR_SEPARATOR.length)];
}

export function joinMajor(first: string, second: string): string {
  return [first.trim(), second.trim()].filter(Boolean).join(MAJOR_SEPARATOR);
}

/** A3: "The type is detected from the URL." */
export function detectLinkKind(url: string): LinkKind {
  const raw = url.trim().toLowerCase();
  let host = raw;
  try {
    host = new URL(/^[a-z][a-z0-9+.-]*:/.test(raw) ? raw : `https://${raw}`).hostname;
  } catch {
    // keep the raw text; the match below decides
  }
  const on = (h: string) => host === h || host.endsWith(`.${h}`);
  if (on("linkedin.com")) return "linkedin";
  if (on("github.com")) return "github";
  if (on("instagram.com")) return "instagram";
  if (on("tiktok.com")) return "tiktok";
  if (on("x.com") || on("twitter.com")) return "x";
  return "website";
}

/**
 * The next `count` graduation years, starting with this academic year's, so
 * a year that has already graduated never shows. Worked out from the date
 * (never a fixed list), so it moves on by itself every July.
 */
export function gradYearChoices(now = new Date(), count = 4): number[] {
  // From July, this year's seniors have graduated.
  const first = now.getUTCMonth() >= 6 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  return Array.from({ length: count }, (_, i) => first + i);
}
