import { redirect } from "next/navigation";

import { BrandGoogleButton } from "@/components/auth/google-sign-in-button";
import { AuthCard, AuthTitle } from "@/components/brand/auth-card";
import { FormMessage, OrDivider } from "@/components/brand/fields";
import { AFTER_SIGN_IN, safeCallbackUrl } from "@/lib/auth/callback-url";
import { auth } from "@/lib/auth/config";
import { googleSignInEnabled } from "@/lib/auth/google-sign-in";

import { PasswordSignInForm } from "./password-sign-in-form";

export const metadata = { title: "Log in · Bananasplit" };

/**
 * Auth.js sends its errors here (pages.error). The remaining ways a Google
 * sign-in can be refused after 0A Fix 4(d), explained in plain words.
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "That Google account is linked to a different Bananasplit account than the one you're signed in with. Sign out, then sign in with your email and password, or with the Google account you used before.",
  AccessDenied:
    "Google didn't confirm that your email address is verified, so we couldn't sign you in with it. Verify the address with Google, or sign in with your email and password.",
  Verification: "That sign-in link is no longer valid.",
  SessionEnded: "You were signed out because that account no longer exists here. Sign in again.",
};

/** Log in: the auth card with "Welcome back." (design: App screens, 01). */
export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const session = await auth();
  const { error, callbackUrl: rawCallbackUrl, notice } = await searchParams;
  const errorCode = typeof error === "string" ? error : undefined;
  // Where to go after signing in: a same-origin relative path only.
  const callbackUrl = safeCallbackUrl(rawCallbackUrl);
  // A signed-in user normally has nothing to do here, unless Auth.js sent
  // them back with an error to explain (e.g. OAuthAccountNotLinked). They go
  // on into the app, as after signing in, not back to the marketing page.
  if (session && !errorCode) {
    redirect(callbackUrl ?? AFTER_SIGN_IN);
  }

  const errorMessage = errorCode
    ? (AUTH_ERROR_MESSAGES[errorCode] ?? "Something went wrong signing you in. Try again.")
    : null;
  // Only offered when the Google client is configured; otherwise the button
  // would only reach Auth.js's "server configuration" error.
  const googleEnabled = googleSignInEnabled();

  return (
    <AuthCard>
      <AuthTitle title="Welcome back." description="Log in to your club workspace." />
      {notice === "password-reset" && !errorMessage && (
        <FormMessage tone="info">Your password is changed. Log in with the new one.</FormMessage>
      )}
      {errorMessage && <FormMessage>{errorMessage}</FormMessage>}
      {googleEnabled && (
        <>
          <BrandGoogleButton redirectTo={callbackUrl} />
          <OrDivider />
        </>
      )}
      <PasswordSignInForm callbackUrl={callbackUrl} />
    </AuthCard>
  );
}
