import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { rememberJoinCode } from "../join-code-cookie";

/**
 * /onboarding/join/remember?code=RPKA-YWSF: the join page sends a member
 * here when profile setup comes first, because a page can't set a cookie.
 * Keeps the club code from their join link (join-code-cookie.ts), then
 * starts profile setup. Signed in or not makes no difference here: the
 * profile pages ask for sign-in themselves.
 */
export async function GET(request: NextRequest) {
  await rememberJoinCode(request.nextUrl.searchParams.get("code") ?? "");
  redirect("/onboarding/profile/basics");
}
