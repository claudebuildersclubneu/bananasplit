import Link from "next/link";

import { SignOutLink } from "@/components/auth/sign-out-link";
import { Logo } from "@/components/brand/logo";
import { pill } from "@/components/brand/pill";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Features", href: "#features" },
  { label: "Finance", href: "#finance" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

/**
 * The floating bar: a glass capsule (glass-light) over whatever scrolls
 * beneath, inset from the edges. Below md the section links drop out, and
 * on the narrowest phones the name, so the mark, Log in and the call to
 * action fit on one line. Signed in, the call to action is "Open your club"
 * (the app) and Log in becomes Sign out.
 */
export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6">
      <div className="glass-light mx-auto flex h-14 max-w-[1240px] items-center gap-3 rounded-full pr-2 pl-4 sm:pl-5 md:gap-8">
        <a href="#top" className="logo-lockup flex" aria-label="Bananasplit" data-plain>
          <Logo size={26} textSize={19} wordmarkClassName="hidden min-[400px]:inline" />
        </a>
        <nav className="hidden flex-1 gap-1 text-[14px] font-medium md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-full px-3 py-2 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          {signedIn ? (
            <>
              <SignOutLink
                className={cn(pill({ tone: "outline", size: "md" }), "border-transparent")}
              />
              <Link href="/app" className={pill({ tone: "glow", size: "md" })}>
                Open your club
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className={cn(pill({ tone: "outline", size: "md" }), "border-transparent")}
              >
                Log in
              </Link>
              <a href="#pricing" className={pill({ tone: "glow", size: "md" })}>
                Create your club
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
