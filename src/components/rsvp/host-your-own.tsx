import Link from "next/link";

import { ArrowRight } from "@/components/brand/arrows";
import { pill } from "@/components/brand/pill";
import { accentScaleStyle, BRAND_ACCENT_SCALE } from "@/lib/theme/accent";
import { cn } from "@/lib/utils";

/**
 * The bottom of every public RSVP page: guests who liked it can make pages
 * like it for their own club. RSVP pages come with every club, the Free plan
 * included, so the one way in is signing up. Always ink on the page,
 * whatever background the host chose, and Bananasplit's own yellow (it is
 * Bananasplit's invitation, not the club's) even on a themed club's page.
 */
export function HostYourOwn() {
  return (
    <aside
      aria-label="Make RSVP pages for your club"
      className="mx-auto w-full max-w-[1000px] px-5 pb-10 sm:px-8"
      style={accentScaleStyle(BRAND_ACCENT_SCALE)}
    >
      <div className="bg-chrome text-chrome-foreground rounded-block relative overflow-hidden px-6 py-7 sm:px-9 sm:py-8">
        <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex flex-col gap-2">
            <p className="text-glow m-0 text-[14px] font-semibold">Hosting something?</p>
            <h2 className="font-heading m-0 text-[clamp(24px,3.4vw,32px)] leading-[1.08] tracking-[-0.02em]">
              Make a page like this one.
            </h2>
            <p className="text-chrome-foreground/70 m-0 max-w-[520px] text-[15px] leading-[1.55]">
              Sign-ups, QR check-in, invite links and a bring list come with every club on
              Bananasplit, the Free plan included.
            </p>
          </div>
          <Link
            href="/sign-up"
            className={cn(
              pill({ size: "md" }),
              "bg-chrome-foreground text-chrome hover:bg-chrome-foreground/90 hover:text-chrome justify-between gap-4",
            )}
          >
            Make RSVP pages for your club, free
            <ArrowRight />
          </Link>
        </div>
      </div>
    </aside>
  );
}
