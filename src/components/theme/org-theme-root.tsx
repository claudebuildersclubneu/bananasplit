import { ThemeProvider } from "@/components/theme-provider";
import { accentStyleSheet } from "@/lib/theme/accent";
import { themeStyleSheet } from "@/lib/theme/css";
import { effectivePalettes, themeProviderMode, type ResolvedTheme } from "@/lib/theme/resolve";
import { lookStyleSheet } from "@/lib/theme/style";
import { getNonce } from "@/lib/security/nonce";

/**
 * The org theme for a subtree (server component): next-themes with the org's
 * default mode (and forced mode when locked), plus the org's design tokens
 * as a server-rendered <style>.
 *
 * - The <style> uses `html:root{...}` / `html.dark{...}`, which beat the
 *   globals.css defaults and reach Radix portals on <body>. It is rendered in
 *   place (no `precedence`), so it leaves the document with the layout when
 *   the viewer switches org, and a Server Action refresh() swaps it in place.
 * - Every value was re-checked as strict hex by themeStyleSheet(); one bad
 *   value drops the sheet and the default theme shows instead.
 * - No nonce on the <style>: the CSP allows inline styles
 *   (style-src 'self' 'unsafe-inline'). next-themes' inline script gets the
 *   request nonce.
 * - The brand's yellow names (bg-banana, bg-butter, text-honey ..., see
 *   src/lib/theme/accent.ts) are pointed at the theme's accent in both
 *   modes, always (the default theme too, so dark mode gets dark tints).
 *   Pages outside a club never render this, so they keep Bananasplit yellow.
 * - Look and feel (corners, text size, fonts) from fixed tables
 *   (src/lib/theme/style.ts); nothing when it is the default.
 */
export async function OrgThemeRoot({
  theme,
  children,
}: {
  theme: ResolvedTheme;
  children: React.ReactNode;
}) {
  const nonce = await getNonce();
  const { defaultTheme, forcedTheme } = themeProviderMode(theme);
  const css = theme.isDefault ? "" : themeStyleSheet(theme.tokens);
  const palettes = effectivePalettes(theme);
  const accents = accentStyleSheet(palettes.light, palettes.dark);
  const look = lookStyleSheet(theme.style);

  return (
    <ThemeProvider defaultTheme={defaultTheme} forcedTheme={forcedTheme} nonce={nonce}>
      {css && <style data-org-theme="" dangerouslySetInnerHTML={{ __html: css }} />}
      {accents && <style data-org-accents="" dangerouslySetInnerHTML={{ __html: accents }} />}
      {look && <style data-org-look="" dangerouslySetInnerHTML={{ __html: look }} />}
      {children}
    </ThemeProvider>
  );
}
