"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

/**
 * Signs out from anywhere a plain button or link fits: the "Signed in as"
 * line, the already-signed-in screen, the RSVP and home page bars. Lands on
 * log in, ready for another account.
 */
export function SignOutLink({
  className,
  children = "Sign out",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className={className ?? "text-ink cursor-pointer font-semibold underline underline-offset-2"}
      disabled={pending}
      onClick={() => {
        setPending(true);
        signOut({ redirectTo: "/sign-in" }).catch(() => setPending(false));
      }}
    >
      {pending ? "Signing out…" : children}
    </button>
  );
}
