"use server";

import { z } from "zod";

import { normalizeEmail } from "@/lib/auth/normalize-email";
import { checkRateLimit, rateLimitKey, retryAfterText } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { requestPasswordReset } from "@/server/email/password-reset";

/**
 * "Forgot your password?": queues a reset link when the address has an
 * account and answers the same either way, so the form never reveals who
 * has one. Limited per client IP and per address before any lookup.
 */
const LIMITS = {
  perIp: { limit: 20, windowSec: 60 * 60 },
  perEmail: { limit: 3, windowSec: 60 * 60 },
} as const;

const emailSchema = z.string().trim().pipe(z.email("Enter a valid email address."));

export interface ForgotPasswordState {
  error?: string;
  /** The address the (possible) link went to; the page shows "check your email". */
  sentTo?: string;
}

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }
  const email = normalizeEmail(parsed.data);

  const ip = await getClientIp();
  const [byIp, byEmail] = await Promise.all([
    checkRateLimit(rateLimitKey("pwreset-ip", ip), LIMITS.perIp.limit, LIMITS.perIp.windowSec, {
      via: "auth",
    }),
    checkRateLimit(
      rateLimitKey("pwreset-email", email),
      LIMITS.perEmail.limit,
      LIMITS.perEmail.windowSec,
      { via: "auth" },
    ),
  ]);
  const limited = !byIp.allowed ? byIp : !byEmail.allowed ? byEmail : null;
  if (limited) {
    return { error: `Too many requests. Try again ${retryAfterText(limited)}.` };
  }

  try {
    await requestPasswordReset(email);
  } catch (error) {
    // Logged without the address; the answer stays the same.
    console.error(
      "[password-reset] could not queue the reset email",
      error instanceof Error ? error.message : error,
    );
  }
  return { sentTo: email };
}
