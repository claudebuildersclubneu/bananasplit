import type { Metadata } from "next";

import { BrandRoot } from "@/components/brand/brand-root";
import { Faq } from "@/components/marketing/faq";
import { FeatureBoard } from "@/components/marketing/feature-board";
import { FinalCta } from "@/components/marketing/final-cta";
import { Finance } from "@/components/marketing/finance";
import { Hero } from "@/components/marketing/hero";
import { Pricing } from "@/components/marketing/pricing";
import { Ripeness } from "@/components/marketing/ripeness";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SignedInProvider } from "@/components/marketing/signed-in";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "Bananasplit: the workspace for student clubs",
  description:
    "Tasks, availability polls, RSVPs, notes, databases and the club budget in one workspace for your club's board.",
};

/**
 * The marketing home page (the design handoff's "Bananasplit Home"). It is
 * the home page for everyone, signed in or not; signed-in visitors get an
 * "Open your club" way into the app (/app) instead of Log in.
 *
 * Prerendered at build time: nothing here reads the request. Who is signed
 * in is asked from the browser (SignedInProvider), and BrandRoot reads no
 * nonce (prerender): "/" is served the static CSP from next.config.ts, and
 * no inline theme script is server-rendered anyway.
 *
 * `overflow-x-clip` keeps wide decoration from scrolling the page sideways
 * without breaking the sticky header, as `hidden` would.
 */
export default function Home() {
  return (
    <BrandRoot className="overflow-x-clip" prerender>
      <SignedInProvider>
        <SiteHeader />
        <main id="top">
          <Hero />
          <FeatureBoard />
          <Ripeness />
          <Finance />
          <Pricing />
          <Faq />
          <FinalCta />
        </main>
        <SiteFooter />
      </SignedInProvider>
    </BrandRoot>
  );
}
