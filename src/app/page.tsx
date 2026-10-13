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
import { SiteHeader } from "@/components/marketing/site-header";
import { getSession } from "@/lib/auth/session";

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
 * `overflow-x-clip` keeps wide decoration from scrolling the page sideways
 * without breaking the sticky header, as `hidden` would.
 */
export default async function Home() {
  const signedIn = Boolean(await getSession());

  return (
    <BrandRoot className="overflow-x-clip">
      <SiteHeader signedIn={signedIn} />
      <main id="top">
        <Hero />
        <FeatureBoard />
        <Ripeness />
        <Finance />
        <Pricing signedIn={signedIn} />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter signedIn={signedIn} />
    </BrandRoot>
  );
}
