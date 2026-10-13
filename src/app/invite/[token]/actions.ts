"use server";

import { redirect } from "next/navigation";

import { setActiveOrgCookie } from "@/lib/active-org-cookie";
import { requireUser } from "@/lib/auth/session";
import { ACCEPT_ERROR_MESSAGES } from "@/lib/invitations";
import { clubRoleHref } from "@/lib/onboarding/steps";
import { acceptInvitation, findInvitationByRawToken } from "@/server/settings/invitations";

export async function acceptInvitationAction(
  rawToken: string,
): Promise<{ error?: string } | undefined> {
  const user = await requireUser();
  const invitation = await findInvitationByRawToken(rawToken);
  if (!invitation) {
    return { error: "This invite link is invalid." };
  }

  const result = await acceptInvitation(invitation, user);
  if (!result.ok) {
    return { error: ACCEPT_ERROR_MESSAGES[result.reason] };
  }

  await setActiveOrgCookie(result.orgId);
  // Then the one small club step: "Your role in <club>".
  redirect(clubRoleHref(result.orgSlug));
}
