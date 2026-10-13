"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";

/**
 * Whether the visitor is signed in, for the home page's few signed-in
 * touches ("Open your club" instead of Log in, plans that go straight to
 * club setup). The home page is static, so the server cannot know: this
 * asks the Auth.js session endpoint once after the page loads. Until it
 * answers, everyone sees the signed-out links, which still work for a
 * signed-in visitor (/sign-in and /sign-up send them on into the app).
 */

const SignedInContext = createContext(false);

export function SignedInProvider({ children }: { children: React.ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ user?: unknown } | null>) : null))
      .then((session) => {
        if (live) setSignedIn(Boolean(session?.user));
      })
      .catch(() => {
        // Stay signed out: those links work for everyone.
      });
    return () => {
      live = false;
    };
  }, []);
  return <SignedInContext.Provider value={signedIn}>{children}</SignedInContext.Provider>;
}

/** False until the session endpoint says otherwise (and outside the provider). */
export function useSignedIn(): boolean {
  return useContext(SignedInContext);
}

const CTA =
  "bg-ink text-cream hover:bg-ink-hover hover:text-cream rounded-full px-4 py-[9px] text-[14px] font-semibold whitespace-nowrap";

/** The header's right side: Log in and Create your club, or Open your club. */
export function HeaderAccountLinks() {
  if (useSignedIn()) {
    return (
      <Link href="/app" className={CTA}>
        Open your club
      </Link>
    );
  }
  return (
    <>
      <Link href="/sign-in" className="text-[14px] font-medium whitespace-nowrap">
        Log in
      </Link>
      <a href="#pricing" className={CTA}>
        Create your club
      </a>
    </>
  );
}

/** The footer's Log in link, which becomes Open your club when signed in. */
export function FooterAccountLink({ className }: { className?: string }) {
  return useSignedIn() ? (
    <Link href="/app" className={className}>
      Open your club
    </Link>
  ) : (
    <Link href="/sign-in" className={className}>
      Log in
    </Link>
  );
}
