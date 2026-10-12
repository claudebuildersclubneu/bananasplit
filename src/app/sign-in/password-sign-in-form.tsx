"use client";

import Link from "next/link";
import { useActionState } from "react";

import { BrandField, BrandInput, FormMessage, PrimaryButton } from "@/components/brand/fields";

import { passwordSignInAction } from "./actions";

export function PasswordSignInForm({ callbackUrl }: { callbackUrl?: string | null }) {
  const [state, formAction, isPending] = useActionState(passwordSignInAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
      <BrandField id="email" label="Email">
        <BrandInput
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@school.edu"
        />
      </BrandField>
      <BrandField
        id="password"
        label="Password"
        aside={
          <Link href="/forgot-password" className="text-honey font-medium">
            Forgot?
          </Link>
        }
      >
        <BrandInput
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </BrandField>
      {state.error && <FormMessage>{state.error}</FormMessage>}
      <PrimaryButton type="submit" disabled={isPending}>
        {isPending ? "Logging in…" : "Log in"}
      </PrimaryButton>
      <p className="text-ink-muted m-0 text-center text-[14px]">
        New to Bananasplit?{" "}
        <Link href="/sign-up" className="font-bold">
          Create an account
        </Link>
      </p>
    </form>
  );
}
