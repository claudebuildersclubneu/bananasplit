import { ArrowUpRight, Check, Ticket } from "lucide-react";
import Link from "next/link";

import { BlockCard } from "@/components/ui/block-card";
import { Gauge } from "@/components/ui/meters";
import { cn } from "@/lib/utils";

/**
 * The Overview's goal blocks (tone "goal": progress toward something):
 * seats taken for the next RSVP event (redesign guide 8.4) and a new
 * club's first steps (9.2, "3 of 7 steps").
 */

function OpenCircle({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="grid size-8 place-items-center rounded-full ring-1 ring-current/25 transition-transform hover:ring-current/50 active:scale-[0.94]"
    >
      <ArrowUpRight className="size-4" aria-hidden="true" />
    </Link>
  );
}

export function RsvpGoalBlock({
  event,
  when,
  taken,
  href,
  createHref,
}: {
  event: { title: string; capacity: number } | null;
  /** "Sat, Oct 24". */
  when: string | null;
  /** Seats taken, or null when the page hides its count. */
  taken: number | null;
  href: string | null;
  /** Where an officer sets up an RSVP page (none for members). */
  createHref: string | null;
}) {
  if (!event || !href) {
    return (
      <div className="bg-muted/60 rounded-block flex h-full min-h-40 flex-col justify-between gap-4 p-5">
        <span className="text-muted-foreground inline-flex items-center gap-2 text-[13px] font-medium">
          <Ticket className="size-4" aria-hidden="true" />
          RSVPs
        </span>
        <p className="text-sm">
          No event with a capacity coming up.
          {createHref && (
            <>
              {" "}
              <Link href={createHref} className="font-semibold underline underline-offset-4">
                Make an RSVP page
              </Link>
            </>
          )}
        </p>
      </div>
    );
  }
  const pct = taken === null ? 0 : (taken / Math.max(1, event.capacity)) * 100;
  return (
    <BlockCard
      tone="goal"
      kicker={`RSVPs · ${when}`}
      action={<OpenCircle href={href} label={`Open ${event.title}`} />}
      className="h-full min-h-0"
    >
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Gauge value={pct} caption="full" size={116} />
        <div className="min-w-0 flex-1 basis-28">
          <h3 className="display-title mb-1.5 text-[21px]">
            <Link href={href} className="after:absolute after:inset-0 after:rounded-[inherit]">
              {event.title}
            </Link>
          </h3>
          <p className="text-sm text-(--meta)">
            {taken === null
              ? `${event.capacity} seats`
              : `${taken} of ${event.capacity} seats taken`}
          </p>
        </div>
      </div>
    </BlockCard>
  );
}

export interface GettingStartedState {
  members: boolean;
  picture: boolean;
  event: boolean;
  task: boolean;
  budget: boolean;
  note: boolean;
  /** The club chose its sidebar sections (Admin panel › Sidebar). */
  sections: boolean;
}

const STEPS: { key: keyof GettingStartedState; label: string; href: (slug: string) => string }[] = [
  { key: "members", label: "Invite your members", href: (s) => `/app/${s}/settings/members` },
  { key: "picture", label: "Add a club picture", href: (s) => `/app/${s}/settings/general` },
  { key: "event", label: "Put your first meeting on the calendar", href: (s) => `/app/${s}/calendar` },
  { key: "sections", label: "Pick your club's sections", href: (s) => `/app/${s}/settings/sidebar` },
  { key: "task", label: "Create a task", href: (s) => `/app/${s}/tasks?new=1` },
  { key: "budget", label: "Set up the budget", href: (s) => `/app/${s}/finance/budget` },
  { key: "note", label: "Write or import a note", href: (s) => `/app/${s}/notes` },
];

/**
 * A new club's first steps, for owners and admins, worked out from what
 * the club has: a goal block with a gauge and the steps as links.
 */
export function GettingStartedBlock({
  orgSlug,
  state,
}: {
  orgSlug: string;
  state: GettingStartedState;
}) {
  const done = STEPS.filter((s) => state[s.key]).length;
  return (
    <BlockCard tone="goal" kicker="Get your club started" className="min-h-0">
      <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Gauge value={(done / STEPS.length) * 100} caption="done" size={116} />
          <div>
            <h3 className="display-title text-[23px]">
              {done} of {STEPS.length} steps
            </h3>
            <p className="mt-1 text-sm text-(--meta)">
              {done === STEPS.length ? "All set up. You can remove this widget." : "Pick up where you left off."}
            </p>
          </div>
        </div>
        <ul className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-2">
          {STEPS.map((step) => {
            const complete = state[step.key];
            return (
              <li key={step.key} className="relative z-10">
                <Link
                  href={step.href(orgSlug)}
                  className="flex items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-sm font-medium transition-colors hover:bg-[color-mix(in_oklab,currentColor_10%,transparent)]"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] border-current",
                      complete && "bg-current",
                    )}
                  >
                    {complete && <Check className="size-3 text-(--ring-bg)" strokeWidth={3} />}
                  </span>
                  <span className={cn(complete && "line-through opacity-70")}>
                    {step.label}
                    <span className="sr-only">{complete ? " (done)" : " (to do)"}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </BlockCard>
  );
}
