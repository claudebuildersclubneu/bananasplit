import "../rsvp.css";

import { DoorOpen, ExternalLink, Lock, MapPin, Mic, Video } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { BrandRoot } from "@/components/brand/brand-root";
import { Logo } from "@/components/brand/logo";
import { pill } from "@/components/brand/pill";
import { RegistrationCard } from "@/components/rsvp/registration-card";
import { appUrl } from "@/lib/app-url";
import { googleCalendarUrl, mapsEmbedUrl, mapsSearchUrl, splitLocation } from "@/lib/rsvp/format";
import { dateLine, dateTile, timeLine } from "@/lib/rsvp/when";
import { cn } from "@/lib/utils";
import { loadRsvpPage, rsvpPageTarget, type RsvpPageData } from "@/server/rsvp/page";
import { readRsvpManageKey, rsvpCookieName } from "@/server/rsvp/token";

/**
 * A public RSVP page (docs/features/rsvp.md): anyone with the link sees the
 * event and signs up. Rendered per request (the counts move, and the card
 * depends on this browser's sign-up cookie). Not indexed: a club's event is
 * shared by link, not found by search.
 */
export const dynamic = "force-dynamic";

async function load(slug: string): Promise<RsvpPageData | null> {
  const target = await rsvpPageTarget(slug);
  if (!target) return null;
  const viewerId = readRsvpManageKey((await cookies()).get(rsvpCookieName(target.eventId))?.value);
  return loadRsvpPage(slug, target, viewerId);
}

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await load(slug);
  if (!page) return { title: "Event not found", robots: { index: false } };
  const when = `${dateLine(page.startsAt, page.timeZone, page.allDay)}, ${timeLine(page.startsAt, page.endsAt, page.timeZone, page.allDay)}`;
  const description = `${when} · Hosted by ${page.org.name}`;
  return {
    title: `${page.title} · ${page.org.name}`,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title: page.title,
      description,
      url: appUrl(`/e/${slug}`),
      ...(page.cover ? { images: [{ url: page.cover.s960, width: 960, height: 960 }] } : {}),
    },
  };
}

export default async function RsvpPage({ params }: PageProps<"/e/[slug]">) {
  const { slug } = await params;
  const page = await load(slug);
  if (!page) return <Missing />;

  const tone = page.background.tone;
  const tile = dateTile(page.startsAt, page.timeZone);
  const place = page.location ? splitLocation(page.location) : null;

  const hostedAndGuests = (
    <>
      <HostedBy page={page} />
      <Guests page={page} />
    </>
  );

  return (
    <BrandRoot>
      <div
        data-tone={tone}
        className={cn(
          "rsvp-page relative isolate flex min-h-svh flex-1 flex-col",
          `rsvp-bg-${page.background.id}`,
        )}
      >
        {page.background.id === "cover" && page.cover && (
          <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- a stored WebP variant */}
            <img
              src={page.cover.s480}
              alt=""
              className="size-full scale-125 object-cover blur-3xl"
            />
            <div className="bg-night/60 absolute inset-0" />
          </div>
        )}

        <header className="mx-auto flex w-full max-w-[1000px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/"
            aria-label="Bananasplit home page"
            className="text-(--rsvp-fg) hover:text-(--rsvp-fg)"
          >
            <Logo size={24} textSize={17} />
          </Link>
          {page.ended && (
            <span className="rounded-full border border-(--rsvp-tile-line) bg-(--rsvp-tile) px-3 py-1 text-[12px] font-semibold">
              This event has ended
            </span>
          )}
        </header>

        <main className="mx-auto grid w-full max-w-[1000px] flex-1 gap-8 px-5 pt-2 pb-16 sm:px-8 md:grid-cols-[300px_minmax(0,1fr)] md:gap-12 md:pt-6">
          <aside className="flex flex-col gap-8">
            <Cover page={page} />
            <div className="hidden flex-col gap-8 md:flex">{hostedAndGuests}</div>
          </aside>

          <div className="flex min-w-0 flex-col gap-7">
            <div className="flex flex-col gap-5">
              <h1 className="font-heading text-[clamp(34px,5.4vw,54px)] leading-[1.02] tracking-[-0.03em] text-balance break-words">
                {page.title}
              </h1>

              <div className="flex flex-col gap-3.5">
                <InfoRow
                  tile={
                    <span className="flex w-12 flex-col overflow-hidden rounded-xl border border-(--rsvp-tile-line) bg-(--rsvp-tile) text-center">
                      <span className="bg-banana text-ink py-[2px] text-[10px] font-bold tracking-[0.08em]">
                        {tile.month}
                      </span>
                      <span className="font-heading py-0.5 text-[20px] leading-7">{tile.day}</span>
                    </span>
                  }
                  title={dateLine(page.startsAt, page.timeZone, page.allDay)}
                  detail={timeLine(page.startsAt, page.endsAt, page.timeZone, page.allDay)}
                />
                {place ? (
                  <InfoRow
                    tile={<IconTile icon={<MapPin className="size-5" aria-hidden="true" />} />}
                    title={
                      <a
                        href={mapsSearchUrl(page.location!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-(--rsvp-fg) underline-offset-4 hover:text-(--rsvp-fg) hover:underline"
                      >
                        {place.venue}
                      </a>
                    }
                    detail={place.rest}
                  />
                ) : page.locationHidden ? (
                  <InfoRow
                    tile={<IconTile icon={<Lock className="size-[18px]" aria-hidden="true" />} />}
                    title="Location shared after you sign up"
                    detail="Register to see the address and how to find it."
                  />
                ) : null}
                {page.online && (
                  <InfoRow
                    tile={<IconTile icon={<Video className="size-5" aria-hidden="true" />} />}
                    title="Online"
                    detail={
                      page.joinUrl
                        ? "Your join link is in the card below."
                        : "The join link appears once you sign up."
                    }
                  />
                )}
              </div>
            </div>

            <RegistrationCard
              slug={page.slug}
              viewer={page.viewer}
              closed={page.closed}
              waitlistOnly={page.waitlistOnly}
              spotsLeft={page.spotsLeft}
              joinUrl={page.joinUrl}
              googleCalendarUrl={googleCalendarUrl({
                title: page.title,
                startsAt: page.startsAt,
                endsAt: page.endsAt,
                details: appUrl(`/e/${page.slug}`),
                location: page.location,
              })}
              icsUrl={`/e/${page.slug}/calendar.ics`}
            />

            {page.description && (
              <Section title="About">
                <p className="m-0 text-[16px] leading-[1.65] whitespace-pre-line text-(--rsvp-fg)">
                  {page.description}
                </p>
              </Section>
            )}

            {(page.location || page.locationDetails) && (
              <Section title="Location">
                <div className="flex flex-col gap-4">
                  {page.location && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[16px] font-semibold">{place?.venue}</span>
                      {place?.rest && (
                        <span className="text-[14px] text-(--rsvp-muted)">{place.rest}</span>
                      )}
                    </div>
                  )}
                  {page.locationDetails && (
                    <div className="flex gap-3 rounded-2xl border border-(--rsvp-tile-line) bg-(--rsvp-tile) p-4">
                      <DoorOpen
                        className="mt-0.5 size-5 flex-none text-(--rsvp-soft)"
                        aria-hidden="true"
                      />
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-bold">How to find it</span>
                        <p className="m-0 text-[15px] leading-[1.55] whitespace-pre-line text-(--rsvp-muted)">
                          {page.locationDetails}
                        </p>
                      </div>
                    </div>
                  )}
                  {page.location && (
                    <>
                      <div className="border-ink/10 overflow-hidden rounded-2xl border bg-(--rsvp-tile)">
                        <iframe
                          title={`Map of ${place?.venue ?? "the location"}`}
                          src={mapsEmbedUrl(page.location)}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          className="block h-[240px] w-full border-0 sm:h-[280px]"
                        />
                      </div>
                      <a
                        href={mapsSearchUrl(page.location)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(pill({ tone: "outline", size: "sm" }), "self-start")}
                      >
                        <ExternalLink className="size-4" aria-hidden="true" />
                        Open in Google Maps
                      </a>
                    </>
                  )}
                </div>
              </Section>
            )}

            <div className="flex flex-col gap-8 md:hidden">{hostedAndGuests}</div>
          </div>
        </main>

        <footer className="mx-auto w-full max-w-[1000px] px-5 pb-8 text-center text-[13px] text-(--rsvp-soft) sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-(--rsvp-soft) hover:text-(--rsvp-fg)"
          >
            Event page by <Logo size={16} textSize={13} />
          </Link>
        </footer>
      </div>
    </BrandRoot>
  );
}

function Missing() {
  return (
    <BrandRoot>
      <div className="rsvp-page rsvp-bg-banana flex min-h-svh flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <Logo size={32} textSize={22} />
        <h1 className="font-heading text-[40px] leading-[1.05] tracking-[-0.03em]">
          This event isn&apos;t here
        </h1>
        <p className="text-ink-muted max-w-[420px] text-[16px]">
          The link may be mistyped, or the host turned off sign-ups or removed the event. Ask
          whoever sent it for a new one.
        </p>
        <Link href="/" className={pill({ size: "md" })}>
          Go to Bananasplit
        </Link>
      </div>
    </BrandRoot>
  );
}

function Cover({ page }: { page: RsvpPageData }) {
  if (page.cover) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a stored WebP variant
      <img
        src={page.cover.s960}
        alt=""
        width={960}
        height={960}
        className="shadow-float aspect-square w-full rounded-[22px] object-cover max-md:max-w-[440px]"
      />
    );
  }
  // No cover yet: the event's initial on a banana square.
  return (
    <div
      aria-hidden="true"
      className="bg-peel shadow-float relative grid aspect-square w-full place-items-center overflow-hidden rounded-[22px] max-md:max-w-[440px]"
    >
      <span className="bg-glow-cream absolute -top-16 -right-16 size-56 rounded-full" />
      <span className="font-heading text-ink relative text-[120px] leading-none tracking-[-0.05em]">
        {page.title.trim()[0]?.toUpperCase() ?? "B"}
      </span>
    </div>
  );
}

function IconTile({ icon }: { icon: React.ReactNode }) {
  return (
    <span className="grid size-12 place-items-center rounded-xl border border-(--rsvp-tile-line) bg-(--rsvp-tile) text-(--rsvp-soft)">
      {icon}
    </span>
  );
}

function InfoRow({
  tile,
  title,
  detail,
}: {
  tile: React.ReactNode;
  title: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="flex-none">{tile}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[16px] leading-[1.35] font-semibold break-words">{title}</span>
        {detail && <span className="text-[14px] leading-[1.4] text-(--rsvp-muted)">{detail}</span>}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-(--rsvp-line) pt-5">
      <h2 className="m-0 text-[13px] font-bold tracking-[0.06em] text-(--rsvp-soft) uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function HostedBy({ page }: { page: RsvpPageData }) {
  return (
    <Section title="Hosted by">
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        <li className="flex items-center gap-3">
          {page.org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a stored 64px WebP variant
            <img src={page.org.logoUrl} alt="" className="size-9 rounded-xl object-cover" />
          ) : (
            <span className="bg-ink text-cream font-heading grid size-9 place-items-center rounded-xl text-[16px] ring-1 ring-(--rsvp-tile-line)">
              {page.org.name.trim()[0]?.toUpperCase()}
            </span>
          )}
          <span className="text-[15px] font-semibold">{page.org.name}</span>
        </li>
        {page.host && (
          <li className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full border border-(--rsvp-tile-line) bg-(--rsvp-tile) text-(--rsvp-soft)">
              <Mic className="size-4" aria-hidden="true" />
            </span>
            <span className="text-[15px] font-semibold">{page.host}</span>
          </li>
        )}
      </ul>
    </Section>
  );
}

/** Faces in the row before "+N". */
const AVATARS = 8;

function Guests({ page }: { page: RsvpPageData }) {
  if (page.going === null) return null;
  const guests = page.guests ?? [];
  const named = guests.slice(0, 3).map((g) => g.name);
  const others = page.going - named.length;
  const heading =
    page.going === 0
      ? "Be the first to sign up"
      : `${page.going} going${page.waitlisting ? ` · ${page.waitlisting} waitlisted` : ""}`;
  return (
    <Section title={heading}>
      {page.going > 0 && page.guests && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center">
            {guests.slice(0, AVATARS).map((g, i) => (
              <span
                key={i}
                title={g.name}
                className={cn(
                  "grid size-9 flex-none place-items-center rounded-full text-[12px] font-bold ring-2 ring-(--rsvp-ring)",
                  i > 0 && "-ml-2",
                  g.tone,
                )}
              >
                {g.initials}
              </span>
            ))}
            {page.going > AVATARS && (
              <span className="-ml-2 grid h-9 min-w-9 flex-none place-items-center rounded-full border border-(--rsvp-tile-line) bg-(--rsvp-tile) px-2 text-[12px] font-bold ring-2 ring-(--rsvp-ring) backdrop-blur">
                +{page.going - AVATARS}
              </span>
            )}
          </div>
          <p className="m-0 text-[14px] leading-[1.5] text-(--rsvp-muted)">
            {named.join(", ")}
            {others > 0 ? ` and ${others} ${others === 1 ? "other" : "others"}` : ""}
          </p>
          {guests.length > 3 && (
            <details className="group">
              <summary className="cursor-pointer list-none text-[14px] font-semibold text-(--rsvp-fg) [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">See everyone</span>
                <span className="hidden group-open:inline">Hide the list</span>
              </summary>
              <ul className="m-0 mt-3 grid list-none grid-cols-2 gap-x-4 gap-y-2 p-0 text-[14px]">
                {guests.map((g, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span
                      className={cn(
                        "grid size-6 flex-none place-items-center rounded-full text-[10px] font-bold",
                        g.tone,
                      )}
                    >
                      {g.initials}
                    </span>
                    <span className="truncate">{g.name}</span>
                  </li>
                ))}
                {page.going > guests.length && (
                  <li className="col-span-2 text-(--rsvp-muted)">
                    and {page.going - guests.length} more
                  </li>
                )}
              </ul>
            </details>
          )}
        </div>
      )}
    </Section>
  );
}
