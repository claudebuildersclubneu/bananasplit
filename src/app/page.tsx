import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
 * The marketing home page (the design handoff's "Bananasplit Home").
 * Signed-in visitors go straight to the app.
 *
 * `overflow-x-clip` keeps wide decoration from scrolling the page sideways
 * without breaking the sticky header, as `hidden` would.
 */
export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect("/app");
  }

  return (
    <BrandRoot className="overflow-x-clip">
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
    </BrandRoot>
  );
}
