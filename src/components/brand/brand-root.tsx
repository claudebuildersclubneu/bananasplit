import { ThemeProvider } from "@/components/theme-provider";
import { getNonce } from "@/lib/security/nonce";
import { cn } from "@/lib/utils";

import { brandFontVariables } from "./fonts";

/**
 * Bananasplit's own pages (the home page, sign-in, sign-up, onboarding and
 * checkout): the brand faces and the fixed cream-and-banana palette
 * (src/app/brand.css). The design has one light look, so these pages are
 * always light, whatever the device prefers. Replaces PublicThemeRoot on
 * those routes.
 */
export async function BrandRoot({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const nonce = await getNonce();
  return (
    <ThemeProvider forcedTheme="light" defaultTheme="light" nonce={nonce}>
      <div className={cn(brandFontVariables, "brand flex min-h-svh flex-1 flex-col", className)}>
        {children}
      </div>
    </ThemeProvider>
  );
}
