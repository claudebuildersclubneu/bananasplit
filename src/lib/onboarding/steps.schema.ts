import "server-only";

import { z } from "zod";

import { MAX_LINKS } from "@/lib/profile/links";
import { profileDetailsSchema, profileLinkSchema } from "@/lib/profile/schema";

import { MAX_TITLE } from "./steps";

/**
 * The A1-A3 profile-setup checks the server actions run. Apart from
 * steps.ts so the step pages, which only need its lists and helpers, never
 * pull zod into the browser.
 */

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

/** A1-A3 inputs, as the forms send them. */
export type BasicsInput = z.input<typeof basicsSchema>;
export type SchoolInput = z.input<typeof schoolSchema>;
export type BioInput = z.input<typeof bioSchema>;
