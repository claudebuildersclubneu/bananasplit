import { z } from "zod";

import { PAY_APPS, type PayTo } from "./pay";

/**
 * Validating the pay handles a host types (src/lib/rsvp/pay.ts has the rest
 * of split-the-cost). Kept apart because zod is large and the pay helpers
 * are used by the public event page in the browser: only server code
 * imports this file.
 */

const handle = (pattern: RegExp, message: string) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(/^[@$]/, ""))
    .pipe(z.string().regex(pattern, message))
    .optional()
    .or(z.literal("").transform(() => undefined));

/** Hosts type handles with or without the @ or $; empty means "not offered". */
export const payToSchema = z.object({
  venmo: handle(/^[A-Za-z0-9_-]{5,30}$/, "A Venmo username is 5-30 letters, digits, - or _."),
  cashapp: handle(/^[A-Za-z][A-Za-z0-9_]{0,19}$/, "A $Cashtag is a letter, then up to 19 more."),
  paypal: handle(/^[A-Za-z0-9]{1,20}$/, "A PayPal.me name is up to 20 letters and digits."),
  zelle: z
    .string()
    .trim()
    .max(254)
    .refine(
      (v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^\+?[\d\s().-]{7,20}$/.test(v),
      "Zelle takes the email or phone number you registered with it.",
    )
    .transform((v) => v || undefined)
    .optional(),
});

/** The stored JSON, read defensively (anything unexpected is dropped). */
export function parsePayTo(value: unknown): PayTo {
  const parsed = payToSchema.safeParse(value ?? {});
  if (!parsed.success) return {};
  const out: PayTo = {};
  for (const app of PAY_APPS) {
    const v = parsed.data[app];
    if (v) out[app] = v;
  }
  return out;
}
