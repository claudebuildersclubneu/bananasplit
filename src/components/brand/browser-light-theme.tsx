"use client";

import { useSyncExternalStore } from "react";

import { ThemeProvider } from "@/components/theme-provider";

const subscribe = () => () => {};

/**
 * next-themes' forced light theme, mounted only in the browser (see
 * BrandRoot's `prerender`). Rendered after hydration, its inline script is
 * inserted by React, which never runs it, so no CSP nonce is needed; the
 * provider applies the light theme to <html> from its effect instead.
 */
export function BrowserLightTheme() {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return mounted ? <ThemeProvider forcedTheme="light" defaultTheme="light" /> : null;
}
