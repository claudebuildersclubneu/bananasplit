import Link from "next/link";

import { ArrowRight } from "@/components/brand/arrows";
import { pill } from "@/components/brand/pill";
import { cn } from "@/lib/utils";

/**
 * The bottom of every public RSVP page: guests who liked it can make their
 * own, either one free page (no club, no team) or a whole club on
 * Bananasplit. Always ink on the page, whatever background the host chose.
 */
export function HostYourOwn({ personal }: { personal: boolean }) {
  return (
    <aside
      aria-label="Make your own event page"
      className="mx-auto w-full max-w-[1000px] px-5 pb-10 sm:px-8"
    >
      <div className="bg-ink text-cream relative overflow-hidden rounded-[26px] px-6 py-7 sm:px-9 sm:py-8">
        <span
          aria-hidden="true"
          className="bg-banana/25 absolute -top-24 -right-16 size-64 rounded-full blur-2xl"
        />
        <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex flex-col gap-2">
            <p className="text-banana m-0 text-[12px] font-bold tracking-[0.08em] uppercase">
              {personal ? "Made with Bananasplit" : "Hosting something?"}
            </p>
            <h2 className="font-heading m-0 text-[clamp(24px,3.4vw,32px)] leading-[1.08] tracking-[-0.02em]">
              Make a page like this one. Free.
            </h2>
            <p className="text-dusk-light m-0 max-w-[520px] text-[15px] leading-[1.55]">
              Free with just an account: sign-ups, QR check-in, invite links and a bring list.
              Running a club? Bring your whole team and keep every guest list.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row md:flex-col">
            <Link
              href="/rsvp/new"
              className={cn(
                pill({ size: "md" }),
                "bg-banana text-ink hover:bg-lemon hover:text-ink justify-between gap-4",
              )}
            >
              Create a free RSVP page
              <ArrowRight />
            </Link>
            <Link
              href="/rsvp#clubs"
              className={cn(
                pill({ size: "md" }),
                "border-cream/25 hover:bg-cream/10 hover:text-cream text-cream justify-between gap-4 border bg-transparent",
              )}
            >
              Start your club on Bananasplit
              <ArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
