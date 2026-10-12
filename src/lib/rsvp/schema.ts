import { z } from "zod";

import { normalizePhone } from "./format";

/**
 * A sign-up on a public RSVP page: a name, an email and a phone number,
 * nothing else. Shared by the page's form and its Server Action. The phone
 * comes back normalized (E.164 when it parses).
 */
export const registrationSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100, "That name is too long."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "That email is too long.")
    .pipe(z.email("Enter a valid email address.")),
  phone: z
    .string()
    .trim()
    .max(32, "Enter a valid phone number.")
    .transform((v, ctx) => {
      const phone = normalizePhone(v);
      if (!phone) {
        ctx.addIssue({ code: "custom", message: "Enter a valid phone number." });
        return z.NEVER;
      }
      return phone;
    }),
});

export type RegistrationInput = z.input<typeof registrationSchema>;
