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
    <p className="text-muted-foreground m-0 mt-2 text-[13px] leading-[1.5]">
      Signed in as <span className="text-foreground font-medium">{session.user.email}</span>.{" "}
      <SignOutLink>Not you? Sign out</SignOutLink>
    </p>
  );
}
