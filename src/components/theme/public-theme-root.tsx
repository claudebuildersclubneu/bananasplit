import { ThemeProvider } from "@/components/theme-provider";
import { getNonce } from "@/lib/security/nonce";

/**
 * Light/dark for pages that belong to no org and don't mount BrandRoot
 * (/dev, and a poll or invite link that matches no org): Moonstone's
 * default, dark (redesign guide 17), unless the visitor stored a choice
 * ("system" follows the device), with the default globals.css tokens.
 * Passes the request's CSP nonce to next-themes' inline script on the nonce
 * routes (undefined on static-policy routes, which allow inline scripts).
 */
export async function PublicThemeRoot({ children }: { children: React.ReactNode }) {
  const nonce = await getNonce();
  return (
    <ThemeProvider defaultTheme="dark" nonce={nonce}>
      {children}
    </ThemeProvider>
  );
}
