import { ThemeProvider } from "@/components/theme-provider";
import { getNonce } from "@/lib/security/nonce";
import { cn } from "@/lib/utils";

import { BrowserLightTheme } from "./browser-light-theme";

/**
 * Bananasplit's own pages (the home page, sign-in, sign-up, onboarding,
 * checkout, email confirmation, the 404): the fixed cream-and-banana palette
 * (src/app/brand.css), never a club's theme. The design has one light look,
 * so these pages are always light, whatever the device prefers.
 *
 * By default next-themes server-renders its inline script with the
 * request's CSP nonce (src/proxy.ts sets one on the nonce routes), which
 * reads the request and makes the page dynamic.
 *
 * `prerender` renders without reading the request, for the home page (so it
 * can be prerendered) and the 404 (Next.js renders it into every page's
 * payload, so reading headers there would make every route dynamic, the
 * home page included). No nonce is read and next-themes mounts in the
 * browser only, so no inline script is server-rendered and none needs a
 * nonce: the page works under either policy and nothing is loosened. The
 * forced light theme lands on mount; before that the page has no dark class,
 * so it is light all the same.
 */
export async function BrandRoot({
  children,
  className,
  prerender = false,
}: {
  children: React.ReactNode;
  className?: string;
  prerender?: boolean;
}) {
  const body = (
    <div className={cn("brand flex min-h-svh flex-1 flex-col", className)}>{children}</div>
  );
  if (prerender) {
    return (
      <>
        <BrowserLightTheme />
        {body}
      </>
    );
  }
  const nonce = await getNonce();
  return (
    <ThemeProvider forcedTheme="light" defaultTheme="light" nonce={nonce}>
      {body}
    </ThemeProvider>
  );
}
