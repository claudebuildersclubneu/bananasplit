import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono, Young_Serif } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteOrigin } from "@/lib/brand/site-origin";

/*
 * The type system (the design handoff; globals.css maps these to font-heading,
 * font-sans and font-mono): Young Serif for display, Hanken Grotesk for the
 * interface and body, JetBrains Mono, sparingly, for labels and figures.
 */
const display = Young_Serif({
  variable: "--font-young-serif",
  subsets: ["latin"],
  weight: "400",
});

const body = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

// Only a few labels use the mono, so it isn't worth a preload on every page.
const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  preload: false,
});

const origin = siteOrigin();

export const metadata: Metadata = {
  // The share images (opengraph-image.png, twitter-image.png) need absolute
  // URLs. Without a base Next.js guesses the host (localhost off Vercel), so
  // they get the same origin as the app's emails. Left out when there is no
  // app URL (see siteOrigin).
  ...(origin ? { metadataBase: new URL(origin) } : {}),
  title: "Bananasplit",
  description:
    "The all-in-one workspace for student clubs: tasks, polls, RSVPs, notes, databases and the club budget.",
};

/*
 * Nothing here reads the request, so pages that read nothing either can be
 * prerendered (the home page is). There is no <SessionProvider>: nothing
 * calls useSession, signOut() works without it, and the session cookie is
 * kept rolling by the signed-in shell (src/components/auth/session-keep-alive.tsx).
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/*
          No ThemeProvider here (Phase 8): next-themes makes a nested provider
          a pass-through, so each page family mounts its own with the right
          default and the request's CSP nonce: the org layout (org mode and
          lock), the org-owned public pages, and PublicThemeRoot elsewhere.
          See src/components/theme-provider.tsx.
        */}
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
