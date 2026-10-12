import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono, Young_Serif } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { auth } from "@/lib/auth/config";

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

const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bananasplit",
  description:
    "The all-in-one workspace for student clubs: tasks, polls, RSVPs, notes, databases and the club budget.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

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
        <SessionProvider session={session}>
          <TooltipProvider>{children}</TooltipProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
