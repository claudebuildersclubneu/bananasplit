import Link from "next/link";

import { AuthCard, AuthTitle } from "@/components/brand/auth-card";
import { pill } from "@/components/brand/pill";
import { cn } from "@/lib/utils";

import { SignOutLink } from "./sign-out-link";

/**
 * Log in or sign up while already signed in: say which account, and offer
 * to carry on or to sign out and use another one. (These pages used to
 * redirect a signed-in visitor away, which left someone in the wrong
 * account with no way out.)
 */
export function AlreadySignedIn({
  email,
  name,
  continueTo,
}: {
  email: string;
  name: string | null;
  continueTo: string;
}) {
  const first = name?.trim().split(" ")[0];
  return (
    <AuthCard>
      <AuthTitle
        title="You're already signed in."
        description={
          <>
            As <span className="text-ink font-semibold">{email}</span>.
          </>
        }
      />
      <Link href={continueTo} className={cn(pill({ raised: true }), "w-full")}>
        Continue{first ? ` as ${first}` : ""}
      </Link>
      <SignOutLink className={cn(pill({ tone: "outline" }), "w-full")}>
        Sign out and use another account
      </SignOutLink>
    </AuthCard>
  );
}
