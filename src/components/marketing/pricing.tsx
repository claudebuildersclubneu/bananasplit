"use client";

import { Fragment, useState } from "react";

import { CLUB_PLANS, dollars, TEAM_PLANS } from "@/lib/billing/plans";
import { CONTACT_HREF } from "@/lib/brand/links";
import { cn } from "@/lib/utils";

import { SectionTitle } from "./section-title";
import { SiteLink } from "./site-link";

type Audience = "clubs" | "teams";

type Tier = {
  name: string;
  /** The featured tier is lifted out with a banana ring, an ink button and its badge. */
  featured?: boolean;
  badge?: string;
  who: string;
  price: string;
  per: string;
  note: string;
  cta: string;
  href: string;
  lead: string;
  items: readonly string[];
};

const AUDIENCES = [
  { id: "clubs", label: "Student clubs" },
  { id: "teams", label: "Teams and businesses" },
] as const;

const COPY: Record<Audience, { title: string; intro: string }> = {
  clubs: {
    title: "Pay for the club you have.",
    intro:
      "Clubs pay per active member, per semester, so you only pay for the people you actually have. Guests who just RSVP are free.",
  },
  teams: {
    title: "Simple pricing for your team.",
    intro: "Teams pay per seat, monthly or yearly. Save about two months with yearly billing.",
  },
};

const TIERS: Record<Audience, readonly Tier[]> = {
  clubs: [
    {
      name: CLUB_PLANS.club.name,
      who: "For active clubs with an officer team.",
      price: dollars(CLUB_PLANS.club.perMemberPerSemester),
      per: "per member / semester",
      note: `A 40-member club pays ${dollars(40 * CLUB_PLANS.club.perMemberPerSemester)} a semester.`,
      cta: "Create your club",
      href: "/sign-up",
      lead: "Everything to run the club:",
      items: [
        "Tasks in five views",
        "Calendar with availability polls and RSVPs",
        "Live notes and 25 GB of club storage",
        "Finance board and receipt reimbursements",
        "Databases with CSV import",
        "2 data connections",
      ],
    },
    {
      name: CLUB_PLANS.society.name,
      featured: true,
      badge: "Most popular",
      who: "For growing clubs that want every feature. Built for big clubs, loved by small ones.",
      price: dollars(CLUB_PLANS.society.perMemberPerSemester),
      per: "per member / semester",
      note: `A 120-member society pays ${dollars(120 * CLUB_PLANS.society.perMemberPerSemester)} a semester.`,
      cta: "Go Society",
      href: "/sign-up",
      lead: "Everything in Club, plus:",
      items: [
        "Public event pages, waitlists and check-in",
        "Custom themes and branding",
        "AI that creates tasks and events and sorts your data",
        "Sponsorship tracking and runway",
        "6 data connections and 100 GB storage",
        "Website sync for events and sign-ups",
        "Audit log and full export",
      ],
    },
  ],
  teams: [
    {
      name: TEAM_PLANS.team.name,
      featured: true,
      badge: "For teams",
      who: "For startups, studios and groups outside school.",
      price: dollars(TEAM_PLANS.team.perSeatPerMonth),
      per: "per seat / month",
      note: `Or ${dollars(TEAM_PLANS.team.perSeatPerYear)} per seat billed yearly.`,
      cta: "Start your team",
      href: "/sign-up",
      lead: "Every Society feature, plus:",
      items: [
        "Google Workspace sign-in",
        "Unlimited data connections",
        "250 GB storage",
        "Admin roles and permissions",
        "Priority support",
      ],
    },
    {
      name: TEAM_PLANS.business.name,
      who: "For organizations with several teams.",
      price: dollars(TEAM_PLANS.business.perSeatPerMonth),
      per: "per seat / month",
      note: `Or ${dollars(TEAM_PLANS.business.perSeatPerYear)} per seat billed yearly.`,
      cta: "Talk to us",
      href: CONTACT_HREF,
      lead: "Everything in Team, plus:",
      items: [
        "Multiple workspaces under one account",
        "Advanced permissions",
        "1 TB storage",
        "Extended audit log retention",
        "Dedicated onboarding",
      ],
    },
  ],
};

const SCHOOL_PERKS = [
  "Every club gets Society features",
  "Club creation by admins, invite code or open sign-up",
  "One invoice per semester for the whole school",
] as const;

const PROMISES = [
  "Cancel anytime",
  "Export your data whenever you want",
  "Student pricing needs a school email",
] as const;

/**
 * Plans for two audiences behind a segmented toggle: per-member, per-semester
 * club plans (plus the school-wide plan), or per-seat team plans.
 */
export function Pricing() {
  const [audience, setAudience] = useState<Audience>("clubs");
  const copy = COPY[audience];

  return (
    <section id="pricing" className="mx-auto flex max-w-[1240px] flex-col gap-10 px-6 py-32">
      <div className="flex flex-col items-center gap-[18px] text-center">
        <SectionTitle>{copy.title}</SectionTitle>
        <p className="text-ink-muted max-w-[540px] text-[17px] leading-[1.55] text-pretty">
          {copy.intro}
        </p>
        <div
          role="group"
          aria-label="Who is it for"
          className="bg-sand mt-2 flex gap-1 rounded-full p-1"
        >
          {AUDIENCES.map(({ id, label }) => {
            const active = audience === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setAudience(id)}
                className={cn(
                  "text-ink cursor-pointer rounded-full px-[18px] py-2.5 text-[14px] font-semibold",
                  active ? "bg-paper shadow-segment" : "bg-transparent",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[940px] grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-stretch gap-4">
        {TIERS[audience].map((tier) => (
          <TierCard key={tier.name} tier={tier} />
        ))}
      </div>

      {audience === "clubs" && <SchoolsPanel />}

      <div className="text-ink-muted flex flex-wrap justify-center gap-x-7 gap-y-2 text-[14px]">
        {PROMISES.map((promise, i) => (
          <Fragment key={promise}>
            {i > 0 && (
              <span aria-hidden="true" className="text-dusk">
                ·
              </span>
            )}
            <span>{promise}</span>
          </Fragment>
        ))}
      </div>
    </section>
  );
}

function TierCard({ tier }: { tier: Tier }) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-5 rounded-[28px] border p-8 tabular-nums",
        tier.featured
          ? "border-banana/90 bg-paper shadow-featured"
          : "border-ink/10 bg-transparent",
      )}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[19px] font-bold">{tier.name}</span>
          {tier.featured && tier.badge && (
            <span className="bg-ink text-banana rounded-full px-2.5 py-[5px] font-mono text-[11px] tracking-[0.05em] uppercase">
              {tier.badge}
            </span>
          )}
        </div>
        <span className="text-ink-muted text-[15px] leading-[1.45]">{tier.who}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <span className="font-heading text-[64px] leading-none tracking-[-0.04em]">
            {tier.price}
          </span>
          <span className="text-ink-muted text-[15px] leading-[1.3]">{tier.per}</span>
        </div>
        <span className="text-ink-soft text-[14px]">{tier.note}</span>
      </div>
      <SiteLink
        href={tier.href}
        className={cn(
          "border-ink rounded-full border p-3.5 text-center text-[15px] font-semibold whitespace-nowrap",
          tier.featured
            ? "bg-ink text-cream hover:border-ink-hover hover:bg-ink-hover"
            : "text-ink hover:bg-paper bg-transparent",
        )}
      >
        {tier.cta}
      </SiteLink>
      <div className="border-ink/10 flex flex-col gap-3 border-t pt-5">
        <span className="text-ink-soft text-[13px] font-bold">{tier.lead}</span>
        {tier.items.map((item) => (
          <div key={item} className="flex gap-2.5 text-[15px] leading-[1.45]">
            <span className="bg-butter text-honey mt-px grid size-5 flex-none place-items-center rounded-full text-[11px] font-extrabold">
              ✓
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The dark "For schools" panel, under the club plans only. */
function SchoolsPanel() {
  return (
    <div className="bg-night text-cream relative grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-center gap-x-14 gap-y-8 overflow-hidden rounded-[28px] p-[clamp(28px,4vw,48px)]">
      <span
        aria-hidden="true"
        className="bg-glow-banana-20 absolute -top-[140px] -right-[120px] size-[380px] rounded-full"
      />
      <div className="relative flex flex-col gap-3.5">
        <span className="text-banana text-[14px] font-bold">For schools</span>
        <h3 className="font-heading text-[clamp(28px,3vw,40px)] leading-[1.06] tracking-[-0.025em] text-balance">
          Run every club on campus from one place.
        </h3>
        <p className="text-dusk max-w-[480px] text-[16px] leading-[1.6]">
          Platform plans host all your clubs under one school, with platform admins deciding who can
          start a club. One per-member, per-semester rate across campus, with volume discounts.
        </p>
      </div>
      <div className="relative flex flex-col items-start gap-5">
        <div className="text-dusk-light flex flex-col gap-2.5 text-[15px]">
          {SCHOOL_PERKS.map((perk) => (
            <span key={perk} className="flex gap-2.5">
              <span className="text-banana">✓</span>
              {perk}
            </span>
          ))}
        </div>
        <SiteLink
          href={CONTACT_HREF}
          className="bg-banana text-ink hover:bg-lemon hover:text-ink rounded-full px-[22px] py-[13px] text-[15px] font-semibold whitespace-nowrap"
        >
          Talk to us
        </SiteLink>
      </div>
    </div>
  );
}
