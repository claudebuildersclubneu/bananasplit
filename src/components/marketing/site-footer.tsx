import { Logo } from "@/components/brand/logo";
import { ThemeSwitch } from "@/components/brand/theme-switch";
import { CONTACT_HREF, PRIVACY_HREF, TERMS_HREF } from "@/lib/brand/links";
import { cn } from "@/lib/utils";

import { CONTAINER } from "./section-title";
import { SiteLink } from "./site-link";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Finance", href: "#finance" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQs", href: "#faq" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", href: "/sign-in" },
      { label: "Create your club", href: "#pricing" },
      { label: "Join with a code", href: "/onboarding/join" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "For schools", href: "#pricing" },
      { label: "Contact", href: CONTACT_HREF },
      { label: "Privacy", href: PRIVACY_HREF },
      { label: "Terms", href: TERMS_HREF },
    ],
  },
] as const;

/**
 * The logo and tagline, three columns of links, then the copyright line and
 * the light/dark switch. Signed in, "Log in" becomes "Open your club" (the
 * app).
 */
export function SiteFooter({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <footer>
      <div className={cn(CONTAINER, "flex flex-col gap-12 pt-[72px] pb-10")}>
        <div className="flex flex-wrap justify-between gap-x-16 gap-y-10">
          <div className="flex max-w-[360px] flex-[1_1_280px] flex-col gap-4">
            <a href="#top" className="logo-lockup flex" data-plain>
              <Logo size={30} textSize={22} />
            </a>
            <p className="text-muted-foreground text-[15px] leading-[1.55]">
              The all-in-one workspace for student clubs and the teams that grow out of them.
            </p>
          </div>
          <div className="grid flex-[2_1_420px] grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-8">
            {COLUMNS.map((column) => (
              <div key={column.title} className="flex flex-col gap-3">
                <span className="text-[13px] font-semibold">{column.title}</span>
                {column.links.map((link) => {
                  const toApp = signedIn && link.href === "/sign-in";
                  return (
                    <SiteLink
                      key={link.label}
                      href={toApp ? "/app" : link.href}
                      className="text-muted-foreground hover:text-foreground w-fit text-[15px] transition-colors"
                    >
                      {toApp ? "Open your club" : link.label}
                    </SiteLink>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="border-border text-muted-foreground flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t pt-6 text-[13px] leading-[1.5]">
          <span>© 2026 Bananasplit</span>
          <ThemeSwitch />
        </div>
      </div>
    </footer>
  );
}
