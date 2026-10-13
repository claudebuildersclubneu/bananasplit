"use client";

import { CalendarPlus, Check, Hourglass, Lock, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cancelMyRegistration, registerForEvent } from "@/app/e/[slug]/actions";
import { BrandField, BrandInput, FormMessage } from "@/components/brand/fields";
import { pill } from "@/components/brand/pill";
import type { ClosedReason } from "@/lib/rsvp/format";
import { formatCents } from "@/lib/rsvp/pay";
import { cn } from "@/lib/utils";

/**
 * The card on a public RSVP page: the sign-up form (name, email, phone),
 * or what this browser's guest has: "You're going" with the calendar and
 * Can't go, or their place on the waitlist. Always paper and ink, whatever
 * background the host picked.
 */

export interface RegistrationCardProps {
  slug: string;
  viewer: {
    status: "GOING" | "WAITLIST";
    firstName: string;
    email: string;
    waitlistPosition: number | null;
  } | null;
  closed: ClosedReason | null;
  waitlistOnly: boolean;
  spotsLeft: number | null;
  joinUrl: string | null;
  googleCalendarUrl: string;
  icsUrl: string;
  /** The invite code of the link this visitor came from (?via=). */
  via?: string | null;
  /** Split the cost: what a new guest would chip in, for the form's note. */
  cost?: { mode: "EACH" | "SPLIT"; shareIfJoining: number; payWith: string[] } | null;
  /** Under "You're going": chip in, the ticket, bring friends. */
  signedExtras?: React.ReactNode;
}

const CLOSED_COPY: Record<ClosedReason, { title: string; body: string }> = {
  ended: { title: "This event has ended", body: "Registration closed when it finished." },
  closed: { title: "Registration is closed", body: "The host isn't taking more sign-ups." },
  full: { title: "This event is full", body: "Every spot is taken and there's no waitlist." },
};

export function RegistrationCard(props: RegistrationCardProps) {
  return (
    <section
      aria-label="Registration"
      className="border-ink/8 bg-paper text-ink shadow-card rounded-[24px] border p-5 sm:p-6"
    >
      {props.viewer ? (
        <Signed {...props} viewer={props.viewer} />
      ) : props.closed ? (
        <Closed reason={props.closed} />
      ) : (
        <SignUpForm {...props} />
      )}
    </section>
  );
}

function CardHeader({ badge }: { badge?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-ink-soft text-[13px] font-bold tracking-[0.06em] uppercase">
        Registration
      </h2>
      {badge}
    </div>
  );
}

function Closed({ reason }: { reason: ClosedReason }) {
  const copy = CLOSED_COPY[reason];
  return (
    <>
      <CardHeader />
      <div className="bg-oat flex items-start gap-3 rounded-2xl p-4">
        <span className="bg-sand text-ink-muted grid size-9 flex-none place-items-center rounded-full">
          <Lock className="size-4" aria-hidden="true" />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-[16px] font-bold">{copy.title}</span>
          <span className="text-ink-muted text-[14px]">{copy.body}</span>
        </span>
      </div>
    </>
  );
}

function SpotsBadge({
  spotsLeft,
  waitlistOnly,
}: {
  spotsLeft: number | null;
  waitlistOnly: boolean;
}) {
  if (waitlistOnly) {
    return (
      <span className="bg-butter text-honey rounded-full px-2.5 py-1 text-[12px] font-bold">
        Waitlist open
      </span>
    );
  }
  if (spotsLeft === null) return null;
  const few = spotsLeft <= 5;
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap",
        few ? "bg-banana text-banana-ink" : "bg-leaf text-leaf-ink",
      )}
    >
      {few ? `Only ${spotsLeft} left` : `${spotsLeft} spots left`}
    </span>
  );
}

function SignUpForm({ slug, waitlistOnly, spotsLeft, via, cost }: RegistrationCardProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [exists, setExists] = useState(false);
  // Controlled, so what the guest typed survives an error: React resets a
  // form's uncontrolled fields after every action.
  const [values, setValues] = useState({ name: "", email: "", phone: "", instagram: "" });
  const bind = (field: keyof typeof values) => ({
    value: values[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value })),
  });

  function submit(form: FormData) {
    setError(null);
    start(async () => {
      const result = await registerForEvent({
        slug,
        ...values,
        website: String(form.get("website") ?? ""),
        via: via ?? "",
      });
      if (!result.ok) {
        setError({ message: result.error, field: result.field });
        return;
      }
      if (result.status === "EXISTS") {
        setExists(true);
        return;
      }
      router.refresh();
    });
  }

  if (exists) {
    return (
      <>
        <CardHeader />
        <FormMessage tone="info">
          That email is already signed up. We&apos;ve sent it a link to see or change your spot.
        </FormMessage>
      </>
    );
  }

  const invalid = (field: string) =>
    error?.field === field
      ? ({ "aria-invalid": true, "aria-describedby": "rsvp-error" } as const)
      : {};

  return (
    <>
      <CardHeader badge={<SpotsBadge spotsLeft={spotsLeft} waitlistOnly={waitlistOnly} />} />
      <p className="text-ink-muted mb-5 text-[15px] leading-[1.5]">
        {waitlistOnly
          ? "This event is full. Join the waitlist and we'll email you the moment a spot opens up."
          : "Save your spot below. You'll get a confirmation by email."}
      </p>
      {cost && !waitlistOnly && (
        <p className="bg-oat text-ink -mt-2 mb-5 rounded-2xl px-4 py-3 text-[14px] leading-[1.5]">
          <span className="font-bold">
            {cost.mode === "SPLIT" ? "About " : ""}
            {formatCents(cost.shareIfJoining)} to chip in
          </span>
          <span className="text-ink-muted">
            {" "}
            {cost.mode === "SPLIT" ? "(your share, and it shrinks as more people join)" : "each"}
            {cost.payWith.length > 0
              ? `. You'll pay the host with ${cost.payWith.join(" or ")} after you sign up.`
              : ". You'll settle up with the host."}
          </span>
        </p>
      )}
      <form action={submit} className="flex flex-col gap-4" noValidate>
        <BrandField id="rsvp-name" label="Name">
          <BrandInput
            id="rsvp-name"
            name="name"
            autoComplete="name"
            placeholder="Your full name"
            required
            maxLength={100}
            {...bind("name")}
            {...invalid("name")}
          />
        </BrandField>
        <BrandField id="rsvp-email" label="Email">
          <BrandInput
            id="rsvp-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            required
            maxLength={254}
            {...bind("email")}
            {...invalid("email")}
          />
        </BrandField>
        <BrandField id="rsvp-phone" label="Phone">
          <BrandInput
            id="rsvp-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="(555) 123-4567"
            required
            maxLength={32}
            {...bind("phone")}
            {...invalid("phone")}
          />
        </BrandField>
        <BrandField
          id="rsvp-instagram"
          label={
            <>
              Instagram <span className="text-ink-soft font-normal">(optional)</span>
            </>
          }
        >
          <BrandInput
            id="rsvp-instagram"
            name="instagram"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="@yourhandle"
            maxLength={200}
            aria-describedby="rsvp-instagram-hint"
            {...bind("instagram")}
            {...invalid("instagram")}
          />
          <span id="rsvp-instagram-hint" className="text-ink-soft text-[13px]">
            Shown next to your name on the guest list, so people can find you.
          </span>
        </BrandField>
        {/* People never see this; bots fill it in. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="rsvp-website">Website</label>
          <input id="rsvp-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        {error && (
          <div id="rsvp-error">
            <FormMessage>{error.message}</FormMessage>
          </div>
        )}
        <button type="submit" disabled={pending} className={cn(pill({ raised: true }), "w-full")}>
          {pending ? "Saving your spot…" : waitlistOnly ? "Join the waitlist" : "Register"}
        </button>
        <p className="text-ink-faint m-0 text-[12px] leading-[1.5]">
          We&apos;ll email your confirmation and text you a reminder before it starts. Message and
          data rates may apply; reply STOP to opt out of texts. Only the hosts see your email and
          number.
        </p>
      </form>
    </>
  );
}

function Signed({
  slug,
  viewer,
  joinUrl,
  googleCalendarUrl,
  icsUrl,
  signedExtras,
}: RegistrationCardProps & { viewer: NonNullable<RegistrationCardProps["viewer"]> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const going = viewer.status === "GOING";

  function cancel() {
    setError(null);
    start(async () => {
      const result = await cancelMyRegistration({ slug });
      if (!result.ok) {
        setError(result.error ?? "That didn't work. Try again.");
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "grid size-12 flex-none place-items-center rounded-full",
            going ? "bg-banana text-banana-ink" : "bg-butter text-honey",
          )}
        >
          {going ? (
            <Check className="size-6" strokeWidth={2.6} aria-hidden="true" />
          ) : (
            <Hourglass className="size-5" aria-hidden="true" />
          )}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-heading text-[26px] leading-[1.1] tracking-[-0.02em]">
            {going ? `You're going, ${viewer.firstName}!` : "You're on the waitlist"}
          </h2>
          <p className="text-ink-muted m-0 text-[14px] leading-[1.5]">
            {going
              ? `Your confirmation went to ${viewer.email}. We'll send a reminder before it starts.`
              : `You're number ${viewer.waitlistPosition ?? 1} in line. If a spot opens up it's yours, and we'll email ${viewer.email}.`}
          </p>
        </div>
      </div>

      {going && (
        <div className="mt-5 flex flex-wrap gap-2">
          {joinUrl && (
            <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={pill({ size: "md" })}
            >
              <Video className="size-4" aria-hidden="true" />
              Join the meeting
            </a>
          )}
          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={pill({ tone: "outline", size: "sm" })}
          >
            <CalendarPlus className="size-4" aria-hidden="true" />
            Google Calendar
          </a>
          <a href={icsUrl} className={pill({ tone: "outline", size: "sm" })}>
            <CalendarPlus className="size-4" aria-hidden="true" />
            Apple / Outlook
          </a>
        </div>
      )}

      {signedExtras && <div className="mt-5 flex flex-col gap-4">{signedExtras}</div>}

      <div className="border-ink/10 mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        {confirming ? (
          <>
            <span className="text-[14px] font-semibold">
              {going ? "Give up your spot?" : "Leave the waitlist?"}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className={pill({ tone: "outline", size: "sm" })}
              >
                Keep it
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={cancel}
                className={cn(pill({ size: "sm" }), "bg-brick hover:bg-brick/90")}
              >
                {pending ? "Cancelling…" : "Yes, cancel"}
              </button>
            </span>
          </>
        ) : (
          <>
            <span className="text-ink-muted text-[14px]">
              {going ? "Can't make it anymore?" : "Changed your mind?"}
            </span>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-ink cursor-pointer text-[14px] font-semibold underline-offset-4 hover:underline"
            >
              {going ? "Can't go" : "Leave the waitlist"}
            </button>
          </>
        )}
      </div>
      {error && (
        <div className="mt-3">
          <FormMessage>{error}</FormMessage>
        </div>
      )}
    </>
  );
}
