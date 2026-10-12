import { redirect } from "next/navigation";

import { BrandGoogleButton } from "@/components/auth/google-sign-in-button";
import { AuthCard, AuthHeadline } from "@/components/brand/auth-card";
import { OrDivider } from "@/components/brand/fields";
import { JoinSteps } from "@/components/brand/join-steps";
import { auth } from "@/lib/auth/config";
import { googleSignInEnabled } from "@/lib/auth/google-sign-in";

import { SignUpForm } from "./sign-up-form";

export const metadata = { title: "Create your account · Bananasplit" };

/** Sign up: step 1 of joining a club (design: App screens, 02). */
export default async function SignUpPage() {
  const session = await auth();
  if (session) {
    redirect("/");
  }

  // Only offered when the Google client is configured (as on /sign-in).
  const googleEnabled = googleSignInEnabled();

  return (
    <AuthCard
      tall
      formClassName="gap-[18px] lg:py-9"
      panel={
        <div className="flex flex-col gap-6">
          <AuthHeadline>Running your club shouldn&apos;t be bananas.</AuthHeadline>
          <JoinSteps current={1} />
        </div>
      }
    >
      <SignUpForm
        google={
          googleEnabled ? (
            <>
              <BrandGoogleButton label="Sign up with Google" />
              <OrDivider />
            </>
          ) : null
        }
      />
    </AuthCard>
  );
}
