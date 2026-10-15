import { getSession } from "@/lib/auth/session";

import { SignOutLink } from "./sign-out-link";

/**
 * "Signed in as … Not you? Sign out" under every auth and onboarding card,
 * so someone in the wrong account can always get out. Nothing when signed
 * out.
 */
export async function SignedInAs() {
  const session = await getSession();
  if (!session) return null;
  return (
    <p className="text-ink-soft border-ink/8 m-0 mt-1 border-t pt-4 text-[13px] leading-normal">
      Signed in as <span className="text-ink-muted font-semibold">{session.user.email}</span>.{" "}
      <SignOutLink>Not you? Sign out</SignOutLink>
    </p>
  );
}
