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
};

/** A cell in the comparison: included, not included, or a value ("25 GB"). */
type Mark = boolean | string;

type Row = { feature: string; marks: readonly Mark[] };

type Section = { title: string; rows: readonly Row[] };

const AUDIENCES = [
  { id: "clubs", label: "Student clubs" },
  { id: "teams", label: "Teams and businesses" },
] as const;

const COPY: Record<Audience, { title: string; intro: string }> = {
  clubs: {
    title: "Free for you. Simple pricing for your club.",
    intro:
      "Personal is free for everyone: your own tasks, calendar, availability polls and RSVP pages, and you can join any club. Clubs pay per active member, per semester, and every new club gets a 30-day free trial, no card. Joining members never pay, and guests who just RSVP are always free.",
  },
  teams: {
    title: "Simple pricing for your team.",
    intro: "Teams pay per seat, monthly or yearly. Save about two months with yearly billing.",
  },
};

/** Where "start a club" goes: straight to setup when signed in, else sign-up first. */
function createClubHref(signedIn: boolean): string {
  return signedIn
    ? "/onboarding/organization"
    : "/sign-up?callbackUrl=%2Fonboarding%2Forganization";
}

/** Where Personal's button goes: the app when signed in, else sign-up. */
function personalHref(signedIn: boolean): string {
  return signedIn ? "/app" : "/sign-up";
}

function tiers(audience: Audience, signedIn: boolean): readonly Tier[] {
  const club = createClubHref(signedIn);
  if (audience === "teams") {
    return [
      {
        name: TEAM_PLANS.team.name,
        featured: true,
        badge: "For teams",
        who: "For startups, studios and groups outside school.",
        price: dollars(TEAM_PLANS.team.perSeatPerMonth),
        per: "per seat / month",
        note: `Or ${dollars(TEAM_PLANS.team.perSeatPerYear)} per seat billed yearly.`,
        cta: "Start your team",
        href: club,
      },
      {
        name: TEAM_PLANS.business.name,
        who: "For organizations with several teams.",
        price: dollars(TEAM_PLANS.business.perSeatPerMonth),
        per: "per seat / month",
        note: `Or ${dollars(TEAM_PLANS.business.perSeatPerYear)} per seat billed yearly.`,
        cta: "Talk to us",
        href: CONTACT_HREF,
      },
    ];
  }
  return [
    {
      name: "Personal",
      who: "Your own tasks, calendar, availability polls and RSVP pages. Join any club free.",
      price: "$0",
      per: "always",
      note: "Every account has one.",
      cta: signedIn ? "Open Personal" : "Sign up free",
      href: personalHref(signedIn),
    },
    {
      name: CLUB_PLANS.club.name,
      who: "For active clubs with an officer team.",
      price: dollars(CLUB_PLANS.club.perMemberPerSemester),
      per: "per member / semester",
      note: "Every new club gets a 30-day free trial, no card.",
      cta: "Start a club",
      href: club,
    },
    {
      name: CLUB_PLANS.society.name,
      featured: true,
      badge: "Most popular",
      who: "For growing clubs that want every feature.",
      price: dollars(CLUB_PLANS.society.perMemberPerSemester),
      per: "per member / semester",
      note: `A 120-member society pays ${dollars(120 * CLUB_PLANS.society.perMemberPerSemester)} a semester.`,
      cta: "Start a club",
      href: club,
    },
  ];
}

/**
 * What each plan includes, one column per tier in the same order as the
 * cards (Personal, Club, Society). The app gates the same features
 * (src/lib/billing/features.ts, src/lib/billing/space.ts): change the two
 * together.
 */
const SECTIONS: Record<Audience, readonly Section[]> = {
  clubs: [
    {
      title: "Free for everyone",
      rows: [
        { feature: "RSVP pages, sign-ups and waitlists", marks: [true, true, true] },
        { feature: "Reminders by email", marks: [true, true, true] },
        { feature: "QR tickets and check-in at the door", marks: [true, true, true] },
        { feature: "Invite links and a bring list", marks: [true, true, true] },
        { feature: "Tasks on a board, a week and a table", marks: [true, true, true] },
        { feature: "A calendar", marks: [true, true, true] },
        { feature: "Availability polls", marks: [true, true, true] },
        { feature: "Join any club", marks: [true, true, true] },
      ],
    },
    {
      title: "Your club",
      rows: [
        { feature: "Members, invitations and roles", marks: [false, true, true] },
        { feature: "A home page for every member", marks: [false, true, true] },
        { feature: "Requests and Sunday updates", marks: [false, true, true] },
        { feature: "Club polls", marks: [false, true, true] },
        { feature: "Member directory and org chart", marks: [false, true, true] },
        { feature: "Live notes and club storage", marks: [false, "25 GB", "100 GB"] },
        { feature: "Finance board and reimbursements", marks: [false, true, true] },
        { feature: "Databases with CSV import, and reports", marks: [false, true, true] },
        { feature: "Data connections, like Google Calendar", marks: [false, "2", "6"] },
      ],
    },
    {
      title: "For growing clubs",
      rows: [
        { feature: "Custom themes and branding", marks: [false, false, true] },
        {
          feature: "AI that creates tasks and events and sorts your data",
          marks: [false, false, true],
        },
        { feature: "Sponsorship tracking and runway", marks: [false, false, true] },
        { feature: "Website sync for events and sign-ups", marks: [false, false, true] },
        { feature: "Audit log", marks: [false, false, true] },
      ],
    },
  ],
  teams: [
    {
      title: "Everything clubs get",
      rows: [{ feature: "Every Society feature", marks: [true, true] }],
    },
    {
      title: "For teams",
      rows: [
        { feature: "Google Workspace sign-in", marks: [true, true] },
        { feature: "Data connections", marks: ["Unlimited", "Unlimited"] },
        { feature: "Storage", marks: ["250 GB", "1 TB"] },
        { feature: "Admin roles and permissions", marks: [true, "Advanced"] },
        { feature: "Priority support", marks: [true, true] },
        { feature: "Several workspaces under one account", marks: [false, true] },
        { feature: "Longer audit log history", marks: [false, true] },
        { feature: "Dedicated onboarding", marks: [false, true] },
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
 * Plans for two audiences behind a segmented toggle: Personal (free) and
 * the per-member, per-semester club plans with their 30-day trial (plus the
 * school-wide plan), or per-seat team plans. The cards carry the price and one button each, in
 * line across the row; what each plan includes is one table underneath.
 */
export function Pricing({ signedIn = false }: { signedIn?: boolean }) {
  const [audience, setAudience] = useState<Audience>("clubs");
  const copy = COPY[audience];
  const plans = tiers(audience, signedIn);

  return (
    <section
      id="pricing"
      className="mx-auto flex max-w-[1240px] flex-col gap-8 px-6 py-20 sm:gap-10 sm:py-32"
    >
      <div className="flex flex-col items-center gap-[18px] text-center">
        <SectionTitle>{copy.title}</SectionTitle>
        <p className="text-ink-muted max-w-[580px] text-[16px] leading-[1.55] text-pretty sm:text-[17px]">
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

      <div
        className={cn(
          "mx-auto grid w-full items-stretch gap-4",
          plans.length > 2 ? "max-w-[1100px] md:grid-cols-3" : "max-w-[760px] md:grid-cols-2",
        )}
      >
        {plans.map((tier) => (
          <TierCard key={tier.name} tier={tier} />
        ))}
      </div>

      <ComparisonTable plans={plans} sections={SECTIONS[audience]} />

      {audience === "clubs" && <SchoolsPanel />}

      <div className="text-ink-muted flex flex-col items-center gap-1.5 text-[14px] sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-7 sm:gap-y-2">
        {PROMISES.map((promise, i) => (
          <Fragment key={promise}>
            {i > 0 && (
              <span aria-hidden="true" className="text-dusk hidden sm:inline">
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

/**
 * A plan's name, who it's for, its price and its button. The button sits at
 * the bottom (mt-auto) and the cards in a row stretch to the same height, so
 * every button lines up across the row whatever the copy above it.
 */
function TierCard({ tier }: { tier: Tier }) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-5 rounded-[28px] border p-6 tabular-nums sm:p-7",
        tier.featured
          ? "border-banana/90 bg-paper shadow-featured"
          : "border-ink/10 bg-transparent",
      )}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="m-0 text-[19px] font-bold">{tier.name}</h3>
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
          <span className="font-heading text-[48px] leading-none tracking-[-0.04em] sm:text-[56px]">
            {tier.price}
          </span>
          <span className="text-ink-muted text-[15px] leading-[1.3]">{tier.per}</span>
        </div>
        <span className="text-ink-soft text-[14px]">{tier.note}</span>
      </div>
      <SiteLink
        href={tier.href}
        className={cn(
          "border-ink mt-auto rounded-full border p-3.5 text-center text-[15px] font-semibold whitespace-nowrap",
          tier.featured
            ? "bg-ink text-cream hover:border-ink-hover hover:bg-ink-hover"
            : "text-ink hover:bg-paper bg-transparent",
        )}
      >
        {tier.cta}
      </SiteLink>
    </div>
  );
}

/** One cell: a check, a muted cross, or a value. */
function MarkCell({ mark, featured }: { mark: Mark; featured?: boolean }) {
  return (
    <td className={cn("px-3 py-3 text-center align-middle", featured && "bg-paper")}>
      {mark === true ? (
        <span className="bg-butter text-honey inline-grid size-6 place-items-center rounded-full text-[12px] font-extrabold">
          <span aria-hidden="true">✓</span>
          <span className="sr-only">Included</span>
        </span>
      ) : mark === false ? (
        <span className="text-ink-ghost text-[16px]">
          <span aria-hidden="true">✕</span>
          <span className="sr-only">Not included</span>
        </span>
      ) : (
        <span className="text-[14px] font-semibold">{mark}</span>
      )}
    </td>
  );
}

/**
 * Every plan's features in one table: a row per feature, a column per plan,
 * grouped under headings, behind a "Compare plans" toggle (a native
 * <details>, like the FAQs) so the cards stay the first thing you see.
 * Scrolls sideways on a narrow phone rather than squeezing the plan names.
 */
function ComparisonTable({
  plans,
  sections,
}: {
  plans: readonly Tier[];
  sections: readonly Section[];
}) {
  return (
    <details className="group border-ink/10 mx-auto w-full max-w-[1100px] rounded-[24px] border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-5 py-4 text-[16px] font-bold sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
        Compare every plan
        <span
          aria-hidden="true"
          className="border-ink/14 group-hover:bg-sand group-open:bg-sand grid size-8 flex-none place-items-center rounded-full border transition-[transform,background-color] group-open:rotate-45"
        >
          <svg
            viewBox="0 0 12 12"
            className="size-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="M6 1v10M1 6h10" />
          </svg>
        </span>
      </summary>
      <div className="border-ink/10 overflow-x-auto border-t">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <caption className="sr-only">What each plan includes</caption>
          <thead>
            <tr className="border-ink/10 border-b">
              <th scope="col" className="text-ink-soft px-5 py-4 text-[14px] font-semibold">
                Compare plans
              </th>
              {plans.map((tier) => (
                <th
                  key={tier.name}
                  scope="col"
                  className={cn(
                    "w-[22%] px-3 py-4 text-center text-[15px] font-bold",
                    tier.featured && "bg-paper",
                  )}
                >
                  {tier.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <Fragment key={section.title}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={plans.length + 1}
                    className="text-ink-soft bg-oat/60 px-5 pt-5 pb-2 text-[12px] font-bold tracking-[0.06em] uppercase"
                  >
                    {section.title}
                  </th>
                </tr>
                {section.rows.map((row) => (
                  <tr key={row.feature} className="border-ink/8 border-t">
                    <th scope="row" className="px-5 py-3 text-[15px] leading-[1.4] font-normal">
                      {row.feature}
                    </th>
                    {row.marks.map((mark, i) => (
                      <MarkCell key={i} mark={mark} featured={plans[i]?.featured} />
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </details>
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
