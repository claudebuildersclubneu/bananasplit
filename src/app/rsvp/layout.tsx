import Link from "next/link";

import { BrandRoot } from "@/components/brand/brand-root";
import { SignOutLink } from "@/components/auth/sign-out-link";
import { Logo } from "@/components/brand/logo";
import { Toaster } from "@/components/ui/toaster";
import { getSession } from "@/lib/auth/session";

/**
 * Free RSVP pages (/rsvp): Bananasplit for someone who only wants an event
 * page, with no club, team or setup. Its own bar, always in the brand's
 * light look; the event screens inside reuse the suite's RSVP components.
 */
export default async function RsvpLayout({ children }: LayoutProps<"/rsvp">) {
  const signedIn = Boolean(await getSession());
  return (
    <BrandRoot className="bg-cream">
      <header className="border-ink/8 bg-cream/85 sticky top-0 z-20 border-b backdrop-blur-[14px]">
        <div className="mx-auto flex max-w-[1120px] items-center gap-3 px-5 py-3">
          <Link href="/" aria-label="Bananasplit home" className="text-ink flex">
            <Logo size={26} textSize={18} wordmarkClassName="hidden min-[400px]:inline" />
          </Link>
          <Link
            href="/rsvp"
            className="bg-banana text-ink rounded-full px-2.5 py-0.5 text-[12px] font-bold tracking-[0.04em] uppercase"
          >
            Events
          </Link>
          <nav className="ml-auto flex items-center gap-4 text-[14px] font-semibold">
            {signedIn ? (
              <>
                <Link href="/rsvp" className="text-ink-muted hidden sm:inline">
                  Your events
                </Link>
                <SignOutLink className="text-ink-muted cursor-pointer whitespace-nowrap" />
                <Link
                  href="/rsvp/new"
                  className="bg-ink text-cream hover:bg-ink-hover hover:text-cream rounded-full px-4 py-[9px] whitespace-nowrap"
                >
                  New event
                </Link>
              </>
            ) : (
              <>
                <Link href="/sign-in?callbackUrl=%2Frsvp" className="text-ink whitespace-nowrap">
                  Log in
                </Link>
                <Link
                  href="/rsvp/new"
                  className="bg-ink text-cream hover:bg-ink-hover hover:text-cream rounded-full px-4 py-[9px] whitespace-nowrap"
                >
                  Create an event
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
      <Toaster />
    </BrandRoot>
  );
}
