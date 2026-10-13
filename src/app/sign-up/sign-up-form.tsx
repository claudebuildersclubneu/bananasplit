"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { AuthTitle } from "@/components/brand/auth-card";
import { BrandField, BrandInput, FormMessage, PrimaryButton } from "@/components/brand/fields";
import { NewPasswordField } from "@/components/brand/new-password-field";
import { pill } from "@/components/brand/pill";
import { signInPath } from "@/lib/auth/callback-url";
import { PRIVACY_HREF, TERMS_HREF } from "@/lib/brand/links";
import { cn } from "@/lib/utils";

import { signUpAction } from "./actions";

/** What comes after the account, under the title. */
const NEXT_STEP = {
  join: "You'll join your club with a code next.",
  create: "Next you'll set up your profile, then your club.",
} as const;

/**
 * `google`: the "Sign up with Google" button and divider, above the fields
 * (not once it's sent). `callbackUrl`: where the new account goes next (a
 * club's join link, or starting a club), carried to log in as well.
 */
export function SignUpForm({
  google,
  callbackUrl = null,
  flow = "join",
}: {
  google?: React.ReactNode;
  callbackUrl?: string | null;
  flow?: keyof typeof NEXT_STEP;
}) {
  const [state, formAction, isPending] = useActionState(signUpAction, {});
  // Controlled, so React's reset after the action doesn't wipe what was typed.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  if (state.checkEmail) {
    return (
      <>
        <AuthTitle
          title="Check your email."
          description={
            <>
              We sent a verification link to{" "}
              <span className="font-semibold">{state.checkEmail}</span>. Open it to verify your
              address, then log in. You need a verified email to join or create a club.
            </>
          }
        />
        {state.error && <FormMessage>{state.error}</FormMessage>}
        <Link href={signInPath(callbackUrl)} className={cn(pill({ raised: true }), "w-full")}>
          Go to log in
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthTitle title="Create your account." description={NEXT_STEP[flow]} />
      {google}
      <form action={formAction} className="flex flex-col gap-[18px]">
        {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
        <BrandField id="name" label="Full name">
          <BrandInput
            id="name"
            name="name"
            required
            autoComplete="name"
            placeholder="Maya Chen"
            className="h-12"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </BrandField>
        <BrandField id="email" label="School email">
          <BrandInput
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@school.edu"
            className="h-12"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </BrandField>
        <NewPasswordField inputClassName="h-12" />
        {state.error && <FormMessage>{state.error}</FormMessage>}
        <PrimaryButton type="submit" disabled={isPending}>
          {isPending ? "Creating account…" : "Create account"}
        </PrimaryButton>
        <p className="text-ink-soft m-0 text-center text-[13px] leading-normal">
          By continuing you agree to the{" "}
          <a href={TERMS_HREF} className="text-ink-muted underline">
            Terms
          </a>{" "}
          and{" "}
          <a href={PRIVACY_HREF} className="text-ink-muted underline">
            Privacy Policy
          </a>
          . Have an account?{" "}
          <Link href={signInPath(callbackUrl)} className="font-bold">
            Log in
          </Link>
        </p>
      </form>
    </>
  );
}
