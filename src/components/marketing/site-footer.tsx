import { Logo } from "@/components/brand/logo";
import { CONTACT_HREF, PRIVACY_HREF } from "@/lib/brand/links";

import { FooterAccountLink } from "./signed-in";
import { SiteLink } from "./site-link";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Finance", href: "/#finance" },
      { label: "Pricing", href: "/#pricing" },
      { label: "FAQs", href: "/#faq" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", href: "/sign-in" },
      { label: "Create your club", href: "/#pricing" },
      { label: "Join with a code", href: "/onboarding/join" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "For schools", href: "/#pricing" },
      { label: "Contact", href: CONTACT_HREF },
      { label: "Privacy", href: PRIVACY_HREF },
    ],
  },
] as const;

/**
 * The logo and tagline, three columns of links, and the copyright line.
 * Signed in, "Log in" becomes "Open your club" (the app), decided in the
 * browser because the page is static (./signed-in).
 */
export function SiteFooter() {
  return (
    <footer className="bg-cream">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-12 px-6 pt-[72px] pb-10">
        <div className="flex flex-wrap justify-between gap-x-16 gap-y-10">
          <div className="flex max-w-[360px] flex-[1_1_280px] flex-col gap-4">
            <SiteLink href="/" className="flex">
              <Logo size={30} textSize={22} />
            </SiteLink>
            <p className="text-ink-muted text-[15px] leading-[1.55]">
              The all-in-one workspace for student clubs and the teams that grow out of them.
            </p>
          </div>
          <div className="grid flex-[2_1_420px] grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-8">
            {COLUMNS.map((column) => (
              <div key={column.title} className="flex flex-col gap-3">
                <span className="text-ink text-[13px] font-bold">{column.title}</span>
                {column.links.map((link) =>
                  link.href === "/sign-in" ? (
                    <FooterAccountLink key={link.label} className="text-ink-muted text-[15px]" />
                  ) : (
                    <SiteLink
                      key={link.label}
                      href={link.href}
                      className="text-ink-muted text-[15px]"
                    >
                      {link.label}
                    </SiteLink>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="border-ink/7 text-ink-faint flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t pt-6 text-[13px] leading-[1.5]">
          <span>© 2026 Bananasplit</span>
        </div>
      </div>
    </footer>
  );
}
