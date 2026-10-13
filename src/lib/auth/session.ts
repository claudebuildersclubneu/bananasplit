import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { CALLBACK_HEADER, signInPath } from "@/lib/auth/callback-url";
import { auth } from "@/lib/auth/config";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

export interface Session {
  user: SessionUser;
}

/**
 * The signed-in user's session, or null. Deduped with React cache(): a page,
 * its layouts and their loaders all ask, and every auth() call decrypts the
 * cookie and runs the session callbacks again, so one request works it out
 * once. Nothing signs in and then reads the session again in the same
 * request: the sign-in and sign-up actions redirect, and Next.js renders
 * the page they redirect to as a request of its own. Where React has no
 * request to share it with (tests, scripts), cache() calls straight through.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return null;
  }
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
    },
  };
});

/**
 * The signed-in user, or a redirect to sign-in that carries a callbackUrl
 * back to the requested page (a same-origin relative path; the proxy passes
 * the path in x-pathname), so an email deep link lands on its task after
 * sign-in.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect(signInPath(await requestedPath()));
  }
  return session.user;
}

async function requestedPath(): Promise<string | null> {
  try {
    return (await headers()).get(CALLBACK_HEADER);
  } catch {
    return null; // outside a request
  }
}
