"use client";

import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  Printer,
  PowerOff,
  ScanLine,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  turnOffRsvpPage,
  turnOnRsvpPage,
} from "@/app/app/[orgSlug]/calendar/[eventId]/rsvp/actions";
import { BackLink } from "@/components/back-link";
import { ItemMenu } from "@/components/item-menu";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/toaster";
import type { RsvpCover } from "@/lib/rsvp/cover";
import { formatCents } from "@/lib/rsvp/pay";

import type { BringLine } from "./bring-list-editor";
import { PagePreview } from "./page-preview";
import { RsvpGuests, type RsvpGuest } from "./rsvp-guests";
import { RsvpSettings, type RsvpSettingsValue } from "./rsvp-settings";

/**
 * An event's RSVP page, from the suite or a free page at /rsvp: its link,
 * the numbers, and two tabs, Guests (the list, check-in, payments, moving
 * people) and Page (how it looks, what it costs, the bring list, what it
 * shows). Before the page is on, one card explains it and turns it on.
 */

export interface RsvpManagerLinks {
  back: { href: string; label: string };
  /** Where the event's title, time and place are edited. */
  edit: string;
  door: string;
  flyer: string;
}

export interface RsvpManagerProps {
  orgId: string;
  event: { id: string; title: string; when: string; location: string | null; ended: boolean };
  page: {
    enabled: boolean;
    url: string | null;
    cover: RsvpCover | null;
    settings: RsvpSettingsValue;
  };
  guests: RsvpGuest[];
  items: BringLine[];
  /** Split the cost: one guest's share now, or null when it's free. */
  owes: number | null;
  messaging: { email: "org" | "platform"; texts: boolean };
  links: RsvpManagerLinks;
  /** A free page: when its guest list goes, and where to save it to a club. */
  personal?: { purgeOn: string | null; purged: boolean; saveHref: string } | null;
  initialTab?: "guests" | "page";
}

export function RsvpManager(props: RsvpManagerProps) {
  const { orgId, event, page, guests, links, personal } = props;
  const router = useRouter();
  const [tab, setTab] = useState<"guests" | "page">(props.initialTab ?? "guests");
  const [pending, start] = useTransition();
  const [confirmEl, confirm] = useConfirm();
  const [copied, setCopied] = useState(false);

  const going = guests.filter((g) => g.status === "GOING");
  const waiting = guests.filter((g) => g.status === "WAITLIST").length;
  const checkedIn = going.filter((g) => g.checkedIn).length;
  const capacity = page.settings.capacity;
  const collected = going
    .filter((g) => g.paid.confirmed)
    .reduce((sum, g) => sum + (g.paid.cents ?? props.owes ?? 0), 0);
  const paidCount = going.filter((g) => g.paid.confirmed).length;

  function turnOn() {
    start(async () => {
      const result = await turnOnRsvpPage(orgId, event.id);
      if (result.error) {
        toast({ title: "Couldn't turn on the page", description: result.error });
        return;
      }
      toast({
        title: "Your RSVP page is live",
        description: "Share the link to start taking sign-ups.",
      });
      router.refresh();
    });
  }

  async function turnOff() {
    const ok = await confirm({
      title: "Turn off the RSVP page?",
      description:
        "The link stops working and nobody new can sign up. Everyone already signed up stays on the list, and turning it back on brings the same link back.",
      confirmLabel: "Turn off",
      run: async () => (await turnOffRsvpPage(orgId, event.id)).error,
    });
    if (ok) router.refresh();
  }

  async function copyLink() {
    if (!page.url) return;
    try {
      await navigator.clipboard.writeText(page.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy", description: page.url });
    }
  }

  const header = (
    <PageHeader
      title={personal ? event.title : "RSVP page"}
      description={personal ? event.when : `${event.title} · ${event.when}`}
      actions={
        page.enabled && page.url ? (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={links.door}>
                <ScanLine aria-hidden="true" />
                Door mode
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={page.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden="true" />
                Open page
              </a>
            </Button>
            <ItemMenu
              label="More RSVP page actions"
              items={[
                {
                  label: "Print a flyer",
                  icon: Printer,
                  onSelect: () => window.open(links.flyer, "_blank", "noopener"),
                },
                {
                  label: "Turn off the page",
                  icon: PowerOff,
                  onSelect: () => void turnOff(),
                  destructive: true,
                  separated: true,
                },
              ]}
            />
          </>
        ) : null
      }
    />
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {confirmEl}
      <BackLink href={links.back.href} label={links.back.label} />
      {header}

      {personal && (
        <section className="bg-card flex flex-wrap items-center gap-4 rounded-xl border p-4">
          <span className="bg-primary/10 text-primary grid size-10 flex-none place-items-center rounded-lg">
            <Building2 className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-semibold">
              {personal.purged
                ? "This free page's guest list was cleared after the event"
                : personal.purgeOn
                  ? `Free pages keep their guest list until ${personal.purgeOn}`
                  : "Free pages keep their guest list for 30 days after the event"}
            </p>
            <p className="text-muted-foreground text-sm">
              Save it to a club to keep every guest for good, see who keeps coming back, and run it
              with your team. The link stays the same.
            </p>
          </div>
          {!personal.purged && (
            <Button asChild size="sm">
              <Link href={personal.saveHref}>Save to a club</Link>
            </Button>
          )}
        </section>
      )}

      {!page.enabled && (
        <section className="bg-card overflow-hidden rounded-xl border">
          <div className="grid gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
            <div className="space-y-3">
              <span className="bg-primary/10 text-primary inline-flex size-9 items-center justify-center rounded-lg">
                <Ticket className="size-5" aria-hidden="true" />
              </span>
              <h2 className="heading text-xl">
                {page.url ? "This RSVP page is off" : "Let anyone sign up with a link"}
              </h2>
              <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
                {page.url
                  ? "Turn it back on and the same link works again. Everyone who signed up is still on the list below."
                  : "A public page for this event: the time and place with a map, who's hosting and who's going, and a sign-up form. Split the cost, hand out a bring list, give every guest an invite link and a QR ticket, and check them in at the door."}
              </p>
              {!personal?.purged && (
                <Button onClick={turnOn} disabled={pending}>
                  <Ticket aria-hidden="true" />
                  {pending
                    ? "Turning on…"
                    : page.url
                      ? "Turn the page back on"
                      : "Turn on the RSVP page"}
                </Button>
              )}
            </div>
            <PagePreview
              cover={page.cover}
              background={page.settings.background}
              title={event.title}
            />
          </div>
        </section>
      )}

      {page.enabled && page.url && (
        <div className="bg-card flex flex-wrap items-center gap-3 rounded-xl border p-3">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Link
          </span>
          <a
            href={page.url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate font-mono text-sm hover:underline"
          >
            {page.url.replace(/^https?:\/\//, "")}
          </a>
          <Button variant="secondary" size="sm" onClick={() => void copyLink()}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      )}

      {(page.enabled || guests.length > 0) && (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Going"
              value={going.length}
              detail={capacity ? `of ${capacity} spots` : "No limit"}
            />
            <Stat
              label="Waitlist"
              value={waiting}
              detail={page.settings.waitlist ? "First in line moves up" : "Waitlist off"}
            />
            {props.owes !== null ? (
              <Stat
                label="Collected"
                value={formatCents(collected)}
                detail={`${paidCount} of ${going.length} paid · ${formatCents(props.owes)} each`}
              />
            ) : (
              <Stat
                label="Spots left"
                value={capacity ? Math.max(0, capacity - going.length) : "∞"}
                detail={
                  page.settings.closed
                    ? "Sign-ups closed"
                    : event.ended
                      ? "Event ended"
                      : "Taking sign-ups"
                }
              />
            )}
            <Stat
              label="Checked in"
              value={checkedIn}
              detail={going.length ? `of ${going.length} going` : "At the door"}
            />
          </dl>

          <Segmented
            label="RSVP page sections"
            value={tab}
            onSelect={(v) => setTab(v as "guests" | "page")}
            options={[
              {
                value: "guests",
                label: `Guests (${guests.filter((g) => g.status !== "CANCELLED").length})`,
              },
              { value: "page", label: "Page settings" },
            ]}
          />

          {tab === "guests" ? (
            <RsvpGuests
              orgId={orgId}
              eventId={event.id}
              eventTitle={event.title}
              guests={guests}
              canAdd={page.enabled}
              shareUrl={page.url}
              owes={props.owes}
            />
          ) : (
            <RsvpSettings
              orgId={orgId}
              eventId={event.id}
              title={event.title}
              location={event.location}
              cover={page.cover}
              initial={page.settings}
              messaging={props.messaging}
              editHref={links.edit}
              going={going.length}
              items={props.items}
              personal={Boolean(personal)}
            />
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <div className="bg-card rounded-xl border p-4">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="heading mt-1 text-2xl tabular-nums">{value}</dd>
      <dd className="text-muted-foreground mt-0.5 text-xs">{detail}</dd>
    </div>
  );
}
