import { redirect } from "next/navigation";

import { BrandGoogleButton } from "@/components/auth/google-sign-in-button";
import { AuthCard, AuthHeadline } from "@/components/brand/auth-card";
import { OrDivider } from "@/components/brand/fields";
import { JoinSteps } from "@/components/brand/join-steps";
import { AFTER_SIGN_IN, CREATE_CLUB_PATH, safeCallbackUrl } from "@/lib/auth/callback-url";
import { auth } from "@/lib/auth/config";
import { googleSignInEnabled } from "@/lib/auth/google-sign-in";

import { SignUpForm } from "./sign-up-form";

export const metadata = { title: "Create your account · Bananasplit" };

/**
 * Sign up: step 1 of joining a club (design: App screens, 02). A
 * ?callbackUrl= (a club's join link, or a pricing button's "start a club")
 * is where the new account goes next; starting a club words the page for
 * that instead of for a club code.
 */
export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const session = await auth();
  const { callbackUrl: rawCallbackUrl } = await searchParams;
  const callbackUrl = safeCallbackUrl(rawCallbackUrl);
  if (session) {
    redirect(callbackUrl ?? AFTER_SIGN_IN);
  }

  const flow = callbackUrl?.startsWith(CREATE_CLUB_PATH) ? "create" : "join";
  // Only offered when the Google client is configured (as on /sign-in).
  const googleEnabled = googleSignInEnabled();

  return (
    <AuthCard
      tall
      formClassName="gap-[18px] lg:py-9"
      panel={
        <div className="flex flex-col gap-6">
          <AuthHeadline />
          <JoinSteps current={1} flow={flow} />
        </div>
      }
    >
      <SignUpForm
        callbackUrl={callbackUrl}
        flow={flow}
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
