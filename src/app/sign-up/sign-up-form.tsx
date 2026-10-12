"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { AuthTitle } from "@/components/brand/auth-card";
import {
  BrandField,
  BrandInput,
  FormMessage,
  PrimaryButton,
  primaryPillClass,
} from "@/components/brand/fields";
import { PRIVACY_HREF, TERMS_HREF } from "@/lib/brand/links";
import { PASSWORD_MIN_LENGTH, passwordStrength } from "@/lib/auth/password-strength";
import { cn } from "@/lib/utils";

import { signUpAction } from "./actions";

/** `google`: the "Sign up with Google" button and divider, above the fields (not once it's sent). */
export function SignUpForm({ google }: { google?: React.ReactNode }) {
  const [state, formAction, isPending] = useActionState(signUpAction, {});
  const [password, setPassword] = useState("");
  const strength = passwordStrength(password);

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
        <Link href="/sign-in" className={cn(primaryPillClass, "w-full")}>
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
          />
        </BrandField>
        <BrandField id="password" label="Password">
          <BrandInput
            id="password"
            name="password"
            type="password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
            className="h-12"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="password-strength"
          />
          <span id="password-strength" className="flex items-center gap-1.5" aria-live="polite">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                aria-hidden="true"
                className={cn(
                  "h-1 flex-1 rounded-[2px]",
                  n <= strength.score ? "bg-banana" : "bg-straw",
                )}
              />
            ))}
            <span className="text-ink-soft ml-1.5 min-w-12 text-[12px]">
              {strength.label && <span className="sr-only">Password strength: </span>}
              {strength.label}
            </span>
          </span>
        </BrandField>
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
