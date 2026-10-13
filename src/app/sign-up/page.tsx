import { AlreadySignedIn } from "@/components/auth/already-signed-in";
import { BrandGoogleButton } from "@/components/auth/google-sign-in-button";
import { AuthCard, AuthHeadline } from "@/components/brand/auth-card";
import { OrDivider } from "@/components/brand/fields";
import { JoinSteps } from "@/components/brand/join-steps";
import { safeCallbackUrl } from "@/lib/auth/callback-url";
import { auth } from "@/lib/auth/config";
import { googleSignInEnabled } from "@/lib/auth/google-sign-in";

import { SignUpForm } from "./sign-up-form";

export const metadata = { title: "Create your account · Bananasplit" };

/**
 * Sign up: one account for everyone (design: App screens, 02). Next comes
 * a quick profile, then joining or starting a club (/onboarding), unless
 * they came from somewhere specific (?callbackUrl=, e.g. an invite link),
 * where they go back.
 */
export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const callbackUrl = safeCallbackUrl((await searchParams).callbackUrl);
  const session = await auth();
  if (session?.user?.email) {
    return (
      <AlreadySignedIn
        email={session.user.email}
        name={session.user.name ?? null}
        continueTo={callbackUrl ?? "/app"}
      />
    );
  }

  // Only offered when the Google client is configured (as on /sign-in).
  const googleEnabled = googleSignInEnabled();

  return (
    <AuthCard
      tall
      formClassName="gap-[18px] lg:py-9"
      panel={
        <div className="flex flex-col gap-6">
          <AuthHeadline />
          <JoinSteps current={1} />
        </div>
      }
    >
      <SignUpForm
        callbackUrl={callbackUrl}
        google={
          googleEnabled ? (
            <>
              <BrandGoogleButton label="Sign up with Google" redirectTo={callbackUrl} />
              <OrDivider />
            </>
          ) : null
        }
      />
    </AuthCard>
  );
}
