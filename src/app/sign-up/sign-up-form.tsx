"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { AuthTitle } from "@/components/brand/auth-card";
import { BrandField, BrandInput, FormMessage, PrimaryButton } from "@/components/brand/fields";
import { NewPasswordField } from "@/components/brand/new-password-field";
import { pill } from "@/components/brand/pill";
import { PRIVACY_HREF, TERMS_HREF } from "@/lib/brand/links";
import { cn } from "@/lib/utils";

import { signUpAction } from "./actions";

/** `google`: the "Sign up with Google" button and divider, above the fields (not once it's sent). */
export function SignUpForm({ google }: { google?: React.ReactNode }) {
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
        <Link href="/sign-in" className={cn(pill({ raised: true }), "w-full")}>
          Go to log in
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthTitle
        title="Create your account."
        description="You'll join your club with a code next."
      />
      {google}
      <form action={formAction} className="flex flex-col gap-[18px]">
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
          <Link href="/sign-in" className="font-bold">
            Log in
          </Link>
        </p>
      </form>
    </>
  );
}
