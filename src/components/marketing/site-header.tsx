import Link from "next/link";

import { SignOutLink } from "@/components/auth/sign-out-link";
import { Logo } from "@/components/brand/logo";

const NAV = [
  { label: "Features", href: "#features" },
  { label: "Finance", href: "#finance" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

/**
 * The sticky bar: translucent cream, blurred over whatever scrolls beneath.
 * Below md the section links drop out, and on the narrowest phones the
 * name, so the mark, Log in and the call to action fit on one line. Signed
 * in, the call to action is "Open your club" (the app) and Log in goes.
 */
export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className="border-ink/8 bg-cream/82 sticky top-0 z-20 border-b backdrop-blur-[14px] backdrop-saturate-[1.4]">
      <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-6 py-3 md:gap-8">
        <a href="#top" className="flex" aria-label="Bananasplit">
          <Logo size={28} textSize={20} wordmarkClassName="hidden min-[400px]:inline" />
        </a>
        <nav className="text-ink-muted hidden flex-1 flex-wrap gap-7 text-[14px] font-medium md:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="text-ink-muted">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-[18px]">
          {signedIn ? (
            <>
              <SignOutLink className="cursor-pointer text-[14px] font-medium whitespace-nowrap" />
              <Link
                href="/app"
                className="bg-ink text-cream hover:bg-ink-hover hover:text-cream rounded-full px-4 py-[9px] text-[14px] font-semibold whitespace-nowrap"
              >
                Open your club
              </Link>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="text-[14px] font-medium whitespace-nowrap">
                Log in
              </Link>
              <a
                href="#pricing"
                className="bg-ink text-cream hover:bg-ink-hover hover:text-cream rounded-full px-4 py-[9px] text-[14px] font-semibold whitespace-nowrap"
              >
                Create your club
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
