"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { AuthTitle } from "@/components/brand/auth-card";
import { BrandField, BrandInput, FormMessage, PrimaryButton } from "@/components/brand/fields";
import { pill } from "@/components/brand/pill";
import { cn } from "@/lib/utils";

import { requestPasswordResetAction } from "./actions";

/** Ask for a reset link; then "check your email", the same whether or not the address has an account. */
export function ForgotPasswordForm({
  expiresMinutes,
  googleEnabled,
}: {
  expiresMinutes: number;
  googleEnabled: boolean;
}) {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, {});
  // Controlled, so React's reset after the action doesn't wipe what was typed.
  const [email, setEmail] = useState("");

  if (state.sentTo) {
    return (
      <>
        <AuthTitle
          title="Check your email."
          description={
            <>
              If an account uses <span className="font-semibold">{state.sentTo}</span>, a link to
              set a new password is on its way. It works once and expires in {expiresMinutes}{" "}
              minutes.
            </>
          }
        />
        <Link href="/sign-in" className={cn(pill({ raised: true }), "w-full")}>
          Back to log in
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthTitle
        title="Forgot your password?"
        description="Enter your account's email and we'll send you a link to set a new one."
      />
      <form action={formAction} className="flex flex-col gap-5">
        <BrandField id="email" label="Email">
          <BrandInput
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </BrandField>
        {state.error && <FormMessage>{state.error}</FormMessage>}
        <PrimaryButton type="submit" disabled={isPending}>
          {isPending ? "Sending…" : "Send reset link"}
        </PrimaryButton>
        <p className="text-ink-muted m-0 text-center text-[14px]">
          {googleEnabled && "Signed up with Google? Just log in with Google. "}
          Remembered it?{" "}
          <Link href="/sign-in" className="font-bold">
            Log in
          </Link>
        </p>
      </form>
    </>
  );
}
