import { redirect } from "next/navigation";

import { safeCallbackUrl } from "@/lib/auth/callback-url";
import { requireUser } from "@/lib/auth/session";
import { getOnboardingProfile } from "@/server/onboarding/profile";
import { personalHomeHref } from "@/server/personal/space";

export const metadata = { title: "Welcome · Bananasplit" };

/**
 * /onboarding: where sign-up and sign-in land (docs/features/personal-and-clubs.md).
 *
 * Not onboarded: "Your profile", step 1, for everyone, even someone already
 * in a club (onboardedAt is checked before memberships: the club's layout
 * sends anyone not onboarded here, so checking clubs first would bounce
 * them between the two forever). Onboarded: where sign-up started
 * (?callbackUrl=, when safe), else the Personal dashboard, made on the way
 * if it's missing. Joining or starting a club, and pending email invites,
 * are on that dashboard.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const profile = await getOnboardingProfile(user.id);
  if (!profile) redirect("/auth/session-ended");
  const after = safeCallbackUrl((await searchParams)?.callbackUrl);
  if (!profile.onboardedAt) {
    redirect(
      after
        ? `/onboarding/profile/basics?callbackUrl=${encodeURIComponent(after)}`
        : "/onboarding/profile/basics",
    );
  }
  redirect(after ?? (await personalHomeHref(user.id)));
}
