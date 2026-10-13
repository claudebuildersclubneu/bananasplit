"use client";

import { useEffect } from "react";

/**
 * Keeps a signed-in session rolling. Sessions are JWT cookies (src/lib/auth/
 * config.ts) that expire 30 days after they were last issued, and only a
 * request to the Auth.js session endpoint re-issues one: server components
 * read the cookie but cannot set it. The root layout's <SessionProvider>
 * used to make that request on every tab focus, and the layout read the
 * session on the server for it, which made every page dynamic.
 *
 * The signed-in shell mounts this instead: it asks once when a page loads,
 * then again when the tab comes back after an hour or more, which keeps an
 * active member signed in just the same for far fewer requests. The answer
 * is not used; a session that has ended (a password reset elsewhere) is
 * cleared by the same request, and the next navigation sends them to sign in.
 */

const REFRESH_EVERY_MS = 60 * 60 * 1000;
let lastRefresh = 0;

function refreshSession() {
  const now = Date.now();
  if (now - lastRefresh < REFRESH_EVERY_MS) return;
  lastRefresh = now;
  fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" }).catch(() => {
    // Offline or a blip: try again on the next focus.
    lastRefresh = 0;
  });
}

export function SessionKeepAlive() {
  useEffect(() => {
    refreshSession();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshSession();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  return null;
}
