import { ThemeProvider } from "@/components/theme-provider";
import { getNonce } from "@/lib/security/nonce";
import { cn } from "@/lib/utils";

/**
 * Bananasplit's own pages (the home page, sign-in, sign-up, onboarding,
 * checkout, email confirmation, the 404): the fixed cream-and-banana palette
 * (src/app/brand.css), never a club's theme. The design has one light look,
 * so these pages are always light, whatever the device prefers.
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
      <div className={cn("brand flex min-h-svh flex-1 flex-col", className)}>{children}</div>
    </ThemeProvider>
  );
}
