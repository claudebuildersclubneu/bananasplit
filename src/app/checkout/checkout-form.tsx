"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";

import { ArrowLeft } from "@/components/brand/arrows";
import { CoreMark } from "@/components/brand/logo";
import { CLUB_PLANS, type ClubPlanId } from "@/lib/billing/plans";
import type { SemesterSeason } from "@/lib/billing/semester";
import { PRIVACY_HREF } from "@/lib/brand/links";
import { cn } from "@/lib/utils";

/** "$280.00", "$1,400.00". */
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const NOT_CONNECTED = "Card payments aren't connected yet, so nothing was charged.";

/*
 * The design's Stripe-style fields. Its text has no set line-height (the
 * page sets `leading-[normal]`), so sizes are plain pixel values: Tailwind's
 * named sizes would bring their own line-heights.
 */
const LABEL = "text-[13px] font-semibold text-ink-muted";
const FIELD =
  "h-11 rounded-[8px] border border-fog bg-white px-3 text-[15px] shadow-field focus-banana-sm";
/** A grouped field (card, country + ZIP): one frame, the halo on the frame. */
const GROUP =
  "overflow-hidden rounded-[8px] border border-fog shadow-field focus-within:border-ink focus-within:ring-3 focus-within:ring-banana/35";
/** An input inside a group: no frame of its own. */
const GROUP_INPUT = "h-11 px-3 text-[15px] outline-none";

const COUNTRIES = [
  ["US", "United States"],
  ["CA", "Canada"],
  ["GB", "United Kingdom"],
  ["IE", "Ireland"],
  ["AU", "Australia"],
  ["NZ", "New Zealand"],
  ["IN", "India"],
  ["SG", "Singapore"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["NL", "Netherlands"],
  ["MX", "Mexico"],
] as const;

export interface CheckoutFormProps {
  plan: ClubPlanId;
  clubName: string;
  /** The club's member count (at least 1), or the sample 40 with no club. */
  initialMembers: number;
  email: string;
  backHref: string;
  backLabel: string;
  /** "Jan 12, 2027" (placeholder semester dates; see src/lib/billing/semester.ts). */
  renewsOn: string;
  renewsFor: SemesterSeason;
}

/**
 * Checkout, Stripe Checkout style: the order on cream (left), the card form
 * on white (right). Stacked below lg, the order on top.
 *
 * Billing isn't connected: Subscribe only says so. The form never submits
 * anywhere (onSubmit prevents it, and no field has a `name`, so even a
 * pre-hydration submit carries nothing).
 */
export function CheckoutForm({
  plan,
  clubName,
  initialMembers,
  email,
  backHref,
  backLabel,
  renewsOn,
  renewsFor,
}: CheckoutFormProps) {
  const [members, setMembers] = useState(initialMembers);
  const [notice, setNotice] = useState<string | null>(null);
  const headingId = useId();

  const { name, perMemberPerSemester: rate } = CLUB_PLANS[plan];
  const total = usd.format(rate * members);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(NOT_CONNECTED);
  }

  return (
    <main className="flex flex-1 flex-col leading-[normal] lg:flex-row">
      {/* The order. */}
      <section
        aria-label="Order summary"
        className="bg-cream flex min-w-0 justify-center px-6 py-14 lg:flex-1 lg:justify-end lg:px-18"
      >
        <div className="flex w-full max-w-[440px] flex-col gap-7">
          <Link
            href={backHref}
            aria-label={backLabel}
            className="text-ink-muted hover:text-honey-hover flex items-center gap-3 self-start text-[14px]"
          >
            <ArrowLeft />
            <CoreMark size={24} />
            <span className="text-ink font-semibold">Bananasplit</span>
          </Link>

          <div className="flex flex-col gap-1.5">
            <h1 className="text-ink-muted text-[16px]">Subscribe to {name}</h1>
            <p className="flex items-baseline gap-2">
              <span className="text-[40px] font-bold tracking-[-0.02em] tabular-nums">{total}</span>
              <span className="text-ink-muted text-[15px] leading-[1.25]">
                per
                <br />
                semester
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-2">
                <span className="text-[15px] font-semibold">
                  {name} plan · {clubName}
                </span>
                <span className="text-ink-muted flex items-center gap-2 text-[13px]">
                  <span className="border-ink/16 bg-paper inline-flex items-center overflow-hidden rounded-[8px] border">
                    <button
                      type="button"
                      aria-label="Fewer members"
                      onClick={() => setMembers((n) => Math.max(1, n - 1))}
                      className="size-[30px] cursor-pointer text-[16px] focus-visible:-outline-offset-2"
                    >
                      −
                    </button>
                    <output
                      aria-live="polite"
                      className="text-ink min-w-10 text-center text-[14px] font-bold tabular-nums"
                    >
                      {members}
                    </output>
                    <button
                      type="button"
                      aria-label="More members"
                      onClick={() => setMembers((n) => n + 1)}
                      className="size-[30px] cursor-pointer text-[16px] focus-visible:-outline-offset-2"
                    >
                      +
                    </button>
                  </span>
                  {/* Two flex items, as the design renders them: the gap sets "$7" apart. */}
                  <span>members ×</span>
                  <span>${rate}</span>
                </span>
              </div>
              <span className="text-[15px] font-semibold tabular-nums">{total}</span>
            </div>

            <div className="border-ink/8 bg-paper text-ink-muted flex gap-2.5 rounded-[12px] border px-3.5 py-3 text-[13px] leading-[1.5]">
              <span
                aria-hidden="true"
                className="bg-butter text-honey grid size-[18px] flex-none place-items-center rounded-full text-[11px] font-extrabold"
              >
                i
              </span>
              <span>
                Pick how many members you have now. New members can join any time this semester, and
                the extra seats are only billed at your next renewal, not today.
              </span>
            </div>

            <div className="bg-ink/10 h-px" />
            <div className="flex justify-between text-[15px]">
              <span>Subtotal</span>
              <span className="tabular-nums">{total}</span>
            </div>
            <div className="text-ink-muted flex justify-between text-[15px]">
              <span>Student pricing</span>
              <span>Applied</span>
            </div>
            <div className="bg-ink/10 h-px" />
            <div className="flex justify-between text-[16px] font-bold">
              <span>Total due today</span>
              <span className="tabular-nums">{total}</span>
            </div>
            <span className="text-ink-soft text-[13px]">
              Renews {renewsOn} for the {renewsFor} semester.
            </span>
          </div>
        </div>
      </section>

      {/*
        Payment. Grows to the bottom of the page when stacked, too. min-w-0
        on both halves keeps them equal near lg, where the columns shrink
        below 440px (the inputs' intrinsic widths would otherwise win).
      */}
      <div className="lg:shadow-divider-left flex min-w-0 flex-1 justify-center bg-white px-6 py-14 lg:justify-start lg:px-18">
        <form
          noValidate
          aria-labelledby={headingId}
          onSubmit={onSubmit}
          className="flex w-full max-w-[440px] flex-col gap-5"
        >
          <h2 id={headingId} className="text-[20px] font-semibold">
            Pay with card
          </h2>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Email</span>
            <input type="email" value={email} readOnly className={FIELD} />
          </label>

          <CardFieldsPlaceholder />

          <div className="mt-1.5 flex flex-col">
            <button
              type="submit"
              className="bg-ink text-cream hover:bg-ink-hover h-12 cursor-pointer rounded-[8px] text-[16px] font-semibold"
            >
              Subscribe
            </button>
            {/* Always mounted, so the message is announced when it appears. */}
            <p role="status" className="text-ink-soft text-center text-[13px]">
              {notice && <span className="block pt-2">{notice}</span>}
            </p>
          </div>
          <p className="text-ink-soft text-center text-[12px] leading-[1.5]">
            By subscribing, you allow Bananasplit to charge your card for this payment and future
            renewals. Cancel any time in club settings.
          </p>

          <div className="text-ink-faint mt-auto flex justify-center gap-3.5 text-[12px]">
            <span>
              Powered by <b className="text-ink-muted">stripe</b>
            </span>
            <span aria-hidden="true">|</span>
            <a href={PRIVACY_HREF} className="text-ink-faint">
              Privacy
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}

/**
 * A visual stand-in for Stripe's Payment Element (card number, expiry, CVC,
 * cardholder name, country and ZIP). Production replaces this whole block
 * with the Payment Element, styled with these colours through Stripe's
 * Appearance API. Card data must go from the browser straight to Stripe and
 * never be posted to our own server: that's why these fields have no `name`
 * and autocomplete is off.
 */
function CardFieldsPlaceholder() {
  const countryId = useId();
  return (
    <>
      <fieldset className="min-w-0">
        <legend className={cn(LABEL, "float-left mb-1.5 w-full")}>Card information</legend>
        <div className={cn(GROUP, "clear-both")}>
          <div className="border-fog flex items-center border-b">
            <input
              type="text"
              inputMode="numeric"
              aria-label="Card number"
              placeholder="1234 1234 1234 1234"
              autoComplete="off"
              className={cn(GROUP_INPUT, "min-w-0 flex-1")}
            />
            <span aria-hidden="true" className="flex gap-1 pr-2.5">
              <span className="bg-card-visa h-5 w-[30px] rounded-[4px]" />
              <span className="bg-card-mc h-5 w-[30px] rounded-[4px]" />
              <span className="bg-card-amex h-5 w-[30px] rounded-[4px]" />
            </span>
          </div>
          <div className="flex">
            <input
              type="text"
              inputMode="numeric"
              aria-label="Expiration date (MM / YY)"
              placeholder="MM / YY"
              autoComplete="off"
              className={cn(GROUP_INPUT, "border-fog min-w-0 flex-1 border-r")}
            />
            <input
              type="text"
              inputMode="numeric"
              aria-label="Security code (CVC)"
              placeholder="CVC"
              autoComplete="off"
              className={cn(GROUP_INPUT, "min-w-0 flex-1")}
            />
          </div>
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>Cardholder name</span>
        <input type="text" placeholder="Full name on card" autoComplete="off" className={FIELD} />
      </label>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={countryId} className={LABEL}>
          Country or region
        </label>
        <div className={GROUP}>
          <div className="border-fog relative flex h-11 items-center border-b text-[15px]">
            <select
              id={countryId}
              defaultValue="US"
              autoComplete="off"
              className="h-full w-full cursor-pointer appearance-none pr-8 pl-3 outline-none"
            >
              {COUNTRIES.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
            <span
              aria-hidden="true"
              className="text-ink-faint pointer-events-none absolute right-3"
            >
              ▾
            </span>
          </div>
          <input
            type="text"
            aria-label="ZIP"
            placeholder="ZIP"
            autoComplete="off"
            className={cn(GROUP_INPUT, "w-full")}
          />
        </div>
      </div>
    </>
  );
}
