import { cookies } from "next/headers";

import { normalizeJoinCode } from "@/lib/join-code";

/**
 * The club code from a shared join link (/onboarding/join?code=RPKA-YWSF),
 * kept while a new member sets up their profile first, so the boxes come
 * back filled when they reach the join step. It only fills the boxes: the
 * code is checked on the server like a typed one, and the person still sees
 * which club it opens before joining.
 *
 * A day, long enough to finish profile setup and confirm an email address.
 * httpOnly and only sent to /onboarding.
 */
export const JOIN_CODE_COOKIE = "bs_join_code";

const MAX_AGE_SECONDS = 24 * 60 * 60;

/** Set in a Route Handler or Server Action only (pages can't set cookies). */
export async function rememberJoinCode(rawCode: string): Promise<boolean> {
  const code = normalizeJoinCode(rawCode);
  if (!code) return false;
  (await cookies()).set(JOIN_CODE_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/onboarding",
    maxAge: MAX_AGE_SECONDS,
  });
  return true;
}

/** The remembered code, or "" (re-checked as a code; anything else is ignored). */
export async function rememberedJoinCode(): Promise<string> {
  const raw = (await cookies()).get(JOIN_CODE_COOKIE)?.value ?? "";
  return normalizeJoinCode(raw) ?? "";
}

/** Once the member has joined: a Route Handler or Server Action only. */
export async function forgetJoinCode(): Promise<void> {
  (await cookies()).delete({ name: JOIN_CODE_COOKIE, path: "/onboarding" });
}
