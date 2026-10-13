import {
  Banknote,
  BellRing,
  Check,
  Gift,
  Printer,
  ScanLine,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ArrowRight } from "@/components/brand/arrows";
import { pill } from "@/components/brand/pill";
import { getSession } from "@/lib/auth/session";
import { CLUB_PLANS, dollars } from "@/lib/billing/plans";
import { safeTimeZone } from "@/lib/calendar/dates";
import { dateTile, whenLine } from "@/lib/rsvp/when";
import { cn } from "@/lib/utils";
import { listFreeEvents, type FreeEventSummary } from "@/server/rsvp/free-events";
import { getPersonalSpace, PERSONAL_GUEST_DAYS } from "@/server/rsvp/personal";

export const metadata: Metadata = {
  title: "Free event pages · Bananasplit",
  description:
    "Free RSVP pages for anything: sign-ups and waitlists, QR tickets and check-in, invite links and a bring list. Just an account, no club needed.",
};

/**
 * /rsvp: free event pages. Signed in with events, it opens on them; for
 * everyone it says what a free page does that others don't, and where a
 * club on Bananasplit goes further.
 */
export default async function RsvpHome() {
  const session = await getSession();
  const space = session ? await getPersonalSpace(session.user.id) : null;
  const events = space ? await listFreeEvents(space) : [];
  const timeZone = safeTimeZone(space?.timezone);
  const now = new Date();

  return (
    <main className="flex flex-col">
      {events.length > 0 && (
        <section id="yours" className="mx-auto w-full max-w-[1120px] px-5 pt-10 pb-4">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-heading m-0 text-[clamp(30px,4vw,42px)] leading-[1.05] tracking-[-0.02em]">
                Your events
              </h1>
              <p className="text-ink-muted m-0 mt-1 text-[15px]">
                Free pages keep guest lists for {PERSONAL_GUEST_DAYS} days after each event. Save
                one to a club to keep it.
              </p>
            </div>
            <Link href="/rsvp/new" className={pill({ size: "md" })}>
              New event
              <ArrowRight />
            </Link>
          </div>
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <li key={e.id}>
                <EventCard event={e} timeZone={timeZone} now={now} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Hero compact={events.length > 0} />
      <Features />
      <FreeOrClub signedIn={Boolean(session)} />
    </main>
  );
}

function EventCard({
  event,
  timeZone,
  now,
}: {
  event: FreeEventSummary;
  timeZone: string;
  now: Date;
}) {
  const tile = dateTile(event.startsAt, timeZone);
  const ended = event.endsAt <= now;
  const status = event.purged
    ? { label: "Guest list cleared", tone: "bg-sand text-ink-muted" }
    : !event.enabled
      ? { label: "Page off", tone: "bg-sand text-ink-muted" }
      : ended
        ? { label: "Ended", tone: "bg-sand text-ink-muted" }
        : { label: "Live", tone: "bg-leaf text-leaf-ink" };
  return (
    <Link
      href={`/rsvp/${event.id}`}
      className="border-ink/10 bg-paper hover:border-ink/25 text-ink hover:text-ink group flex h-full gap-4 rounded-[20px] border p-4 transition-colors"
    >
      {event.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a stored WebP variant
        <img src={event.coverUrl} alt="" className="size-16 flex-none rounded-2xl object-cover" />
      ) : (
        <span className="border-ink/10 flex h-16 w-14 flex-none flex-col overflow-hidden rounded-2xl border text-center">
          <span className="bg-banana py-[3px] text-[10px] font-bold tracking-[0.08em]">
            {tile.month}
          </span>
          <span className="font-heading bg-cream flex-1 pt-1 text-[22px] leading-7">
            {tile.day}
          </span>
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-start justify-between gap-2">
          <span className="truncate text-[16px] font-bold">{event.title}</span>
          <span
            className={cn(
              "flex-none rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap",
              status.tone,
            )}
          >
            {status.label}
          </span>
        </span>
        <span className="text-ink-muted truncate text-[13px]">
          {whenLine(event.startsAt, event.endsAt, timeZone, event.allDay)}
        </span>
        <span className="text-ink-soft mt-auto text-[13px]">
          {event.purged
            ? "Save a club next time to keep the list"
            : `${event.going} going${event.waitlist ? ` · ${event.waitlist} waitlist` : ""}${
                ended
                  ? ` · list kept until ${event.purgeOn.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : ""
              }`}
        </span>
      </span>
    </Link>
  );
}

function Hero({ compact }: { compact: boolean }) {
  // The page's h1 is "Your events" when there are some.
  const Heading = compact ? "h2" : "h1";
  return (
    <section
      className={cn("relative overflow-hidden", compact ? "pt-10" : "pt-[clamp(48px,7vw,84px)]")}
    >
      <span
        aria-hidden="true"
        className="bg-banana/45 absolute -top-40 -right-32 size-[520px] rounded-full blur-3xl"
      />
      <div className="relative mx-auto grid max-w-[1120px] gap-10 px-5 pb-14 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-center">
        <div className="flex flex-col gap-5">
          <span className="border-ink/12 bg-paper w-fit rounded-full border px-3 py-1 text-[13px] font-semibold">
            Free event pages · no club needed
          </span>
          <Heading className="font-heading m-0 text-[clamp(40px,6vw,72px)] leading-[0.98] tracking-[-0.035em] text-balance">
            Free RSVP pages for anything.
          </Heading>
          <p className="text-ink-muted m-0 max-w-[540px] text-[clamp(17px,1.5vw,19px)] leading-[1.55]">
            Make an event page in a minute. Guests sign up, get a QR ticket, bring their friends and
            grab something off the bring list, and you check them in at the door. Free, with just an
            account.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/rsvp/new" className={pill({ size: "lg", raised: true })}>
              Create an event, free
              <ArrowRight />
            </Link>
            <a href="#clubs" className={pill({ tone: "outline", size: "lg" })}>
              Running a club?
            </a>
          </div>
        </div>
        <SampleCard />
      </div>
    </section>
  );
}

/** A sample page in miniature: what a guest sees once they're going. */
function SampleCard() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[400px]">
      <div className="bg-ink absolute -inset-3 rotate-2 rounded-[30px] opacity-90" />
      <div className="border-ink/10 bg-paper relative flex flex-col gap-4 rounded-[26px] border p-5 shadow-[0_24px_60px_-28px_rgb(28_24_16/0.5)]">
        <div className="flex items-center gap-3">
          <span className="bg-banana font-heading grid size-12 place-items-center rounded-2xl text-[22px]">
            🍕
          </span>
          <span className="flex flex-col">
            <span className="font-heading text-[22px] leading-tight">Pizza &amp; board games</span>
            <span className="text-ink-muted text-[13px]">Fri 7:00 PM · Maya&apos;s place</span>
          </span>
        </div>
        <div className="bg-butter flex items-center justify-between rounded-2xl px-4 py-3">
          <span className="flex flex-col">
            <span className="font-heading text-[22px] leading-tight">You&apos;re going!</span>
            <span className="text-ink-muted text-[12px]">Your ticket is ready for the door</span>
          </span>
          <span className="bg-ink grid size-11 place-items-center rounded-lg">
            <span className="bg-paper size-6 rounded-[3px]" />
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {[
            ["Chips", "Leo K."],
            ["Speaker", "You"],
            ["Help clean up", "1 more needed"],
          ].map(([item, who]) => (
            <span
              key={item}
              className={cn(
                "flex items-center justify-between rounded-xl border px-3 py-2 text-[13px]",
                who === "You" ? "bg-butter border-ink/20" : "border-ink/10",
              )}
            >
              <span className="font-semibold">{item}</span>
              <span className="text-ink-muted">{who}</span>
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="flex -space-x-2">
            {["bg-banana", "bg-pine", "bg-wheat", "bg-navy"].map((tone) => (
              <span key={tone} className={cn("ring-paper size-7 rounded-full ring-2", tone)} />
            ))}
          </span>
          <span className="bg-banana rounded-full px-2.5 py-1 text-[12px] font-bold">
            3 joined with your link
          </span>
        </div>
      </div>
    </div>
  );
}

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ScanLine,
    title: "QR tickets and door mode",
    body: "Each guest gets a ticket. Scan it with your phone, or search names at the door. Several friends can run doors at once.",
  },
  {
    icon: Users,
    title: "Invite links",
    body: "Every guest gets their own link. Friends see who invited them, and you see who brought the most people.",
  },
  {
    icon: BellRing,
    title: "Spots, waitlist, reminders",
    body: "Cap the spots and keep a waitlist that moves up by itself. Everyone gets a reminder a day and an hour before.",
  },
  {
    icon: Gift,
    title: "A bring list",
    body: "Chips, a speaker, two people to set up. Guests claim lines on the page and everyone sees what's still needed.",
  },
  {
    icon: Printer,
    title: "A printable flyer",
    body: "A poster with a QR code and tear-off tabs, made from your page, for the bulletin board down the hall.",
  },
  {
    icon: Banknote,
    title: "Collect money if you need to",
    body: "Charging for pizza or tickets? Guests pay you directly on Venmo, Cash App, PayPal or Zelle, and you tick them off. We take nothing.",
  },
];

function Features() {
  return (
    <section className="bg-paper border-ink/8 border-y">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-8 px-5 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-heading m-0 max-w-[620px] text-[clamp(30px,4vw,46px)] leading-[1.04] tracking-[-0.025em]">
            More than a sign-up form.
          </h2>
          <p className="text-ink-muted m-0 max-w-[420px] text-[16px] leading-[1.55]">
            Everything a host juggles in the group chat, on the page itself.
          </p>
        </div>
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="border-ink/10 bg-cream flex flex-col gap-3 rounded-[20px] border p-5"
            >
              <span className="bg-banana grid size-10 place-items-center rounded-xl">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="m-0 text-[17px] font-bold">{title}</h3>
              <p className="text-ink-muted m-0 text-[15px] leading-[1.55]">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FreeOrClub({ signedIn }: { signedIn: boolean }) {
  const club = CLUB_PLANS.club;
  const freeRows = [
    "Unlimited event pages",
    "Invite links, bring lists and payments",
    "QR tickets, door mode and flyers",
    `Guest lists kept ${PERSONAL_GUEST_DAYS} days after each event`,
  ];
  const clubRows = [
    "Everything in a free account",
    "Every guest list kept, in your club's People database",
    "Check-ins build attendance history: see who keeps coming back",
    "Run events with your officers",
    "Tasks, polls, notes, the budget and a shared calendar",
    "Move any free event in, link and guests included",
  ];
  return (
    <section
      id="clubs"
      className="mx-auto flex w-full max-w-[1120px] scroll-mt-20 flex-col gap-8 px-5 py-14"
    >
      <div className="flex max-w-[680px] flex-col gap-3">
        <h2 className="font-heading m-0 text-[clamp(30px,4vw,46px)] leading-[1.04] tracking-[-0.025em]">
          A free account, or a whole club?
        </h2>
        <p className="text-ink-muted m-0 text-[16px] leading-[1.55]">
          A free account is just you and your event pages. A club is a shared workspace for your
          officers. Start free, and when the events keep coming, start a club and bring them with
          you.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Plan
          name="Free account"
          price="$0"
          note="Just you and your event pages. Not a club."
          rows={freeRows}
          cta={{ href: "/rsvp/new", label: "Create an event" }}
          tone="paper"
        />
        <Plan
          name="Bananasplit club"
          price={`from ${dollars(club.perMemberPerSemester)}`}
          note="per active member, per semester"
          rows={clubRows}
          cta={{
            href: signedIn ? "/onboarding/organization" : "/sign-up",
            label: "Create your club on Bananasplit",
          }}
          tone="ink"
        />
      </div>
    </section>
  );
}

function Plan({
  name,
  price,
  note,
  rows,
  cta,
  tone,
}: {
  name: string;
  price: string;
  note: string;
  rows: string[];
  cta: { href: string; label: string };
  tone: "paper" | "ink";
}) {
  const ink = tone === "ink";
  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-[24px] border p-6 sm:p-7",
        ink ? "bg-ink text-cream border-ink" : "bg-paper border-ink/10",
      )}
    >
      <div className="flex flex-col gap-1">
        <span className={cn("text-[14px] font-bold", ink ? "text-banana" : "text-ink-soft")}>
          {name}
        </span>
        <span className="font-heading text-[40px] leading-none">{price}</span>
        <span className={cn("text-[14px]", ink ? "text-dusk-light" : "text-ink-muted")}>
          {note}
        </span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {rows.map((row) => (
          <li key={row} className="flex gap-2.5 text-[15px] leading-[1.45]">
            <Check
              className={cn("mt-0.5 size-4 flex-none", ink ? "text-banana" : "text-honey")}
              strokeWidth={2.6}
              aria-hidden="true"
            />
            {row}
          </li>
        ))}
      </ul>
      <Link
        href={cta.href}
        className={cn(
          pill({ size: "md" }),
          "mt-auto",
          ink && "bg-banana text-ink hover:bg-lemon hover:text-ink",
        )}
      >
        {cta.label}
        <ArrowRight />
      </Link>
    </div>
  );
}
