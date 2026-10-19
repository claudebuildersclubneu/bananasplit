import "../rsvp.css";

import { Banknote, DoorOpen, ExternalLink, Lock, MapPin, Mic, Video } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { BrandRoot } from "@/components/brand/brand-root";
import { Logo } from "@/components/brand/logo";
import { pill } from "@/components/brand/pill";
import { BringList, ChipIn, InviteFriends, TicketStub } from "@/components/rsvp/guest-extras";
import { HostYourOwn } from "@/components/rsvp/host-your-own";
import { InstagramLink } from "@/components/rsvp/instagram-link";
import { MapEmbed } from "@/components/rsvp/map-embed";
import { QrCode } from "@/components/rsvp/qr-code";
import { RegistrationCard } from "@/components/rsvp/registration-card";
import { BlockCard } from "@/components/ui/block-card";
import { Gauge } from "@/components/ui/meters";
import { appUrl } from "@/lib/app-url";
import {
  avatarTone,
  googleCalendarUrl,
  initials,
  mapsEmbedUrl,
  mapsSearchUrl,
  splitLocation,
} from "@/lib/rsvp/format";
import { dateLine, dateTile, timeLine } from "@/lib/rsvp/when";
import { brandPageAccentStyle } from "@/lib/theme/accent";
import { getPublicOrgTheme } from "@/lib/theme/loader";
import { effectivePalettes } from "@/lib/theme/resolve";
import { cn } from "@/lib/utils";
import {
  loadRsvpPage,
  rsvpPageTarget,
  type RsvpGuest,
  type RsvpPageData,
} from "@/server/rsvp/page";
import { readRsvpManageKey, rsvpCookieName } from "@/server/rsvp/token";

/**
 * A public RSVP page (docs/features/rsvp.md): anyone with the link sees the
 * event and signs up. Rendered per request (the counts move, and the card
 * depends on this browser's sign-up cookie). Not indexed: a club's event is
 * shared by link, not found by search.
 */
export const dynamic = "force-dynamic";

/**
 * The page's data, once per request: generateMetadata and the page both
 * ask for it with the same slug and ?via=, and cache() hands the second
 * caller the first one's result instead of reading it all again.
 */
const targetFor = cache((slug: string) => rsvpPageTarget(slug));

const load = cache(async (slug: string, via: string | null): Promise<RsvpPageData | null> => {
  const target = await targetFor(slug);
  if (!target) return null;
  const viewerId = readRsvpManageKey((await cookies()).get(rsvpCookieName(target.eventId))?.value);
  return loadRsvpPage(slug, target, viewerId, { via });
});

/**
 * The hosting club's accent as inline custom properties: the page keeps its
 * cream-and-ink look, but its highlights (the date tile, chips, the "Tint"
 * background, focus halos) take the club's theme accent instead of
 * Bananasplit yellow. {} for a club on the default theme.
 */
async function clubAccentStyle(slug: string): Promise<React.CSSProperties> {
  const target = await targetFor(slug);
  const club = target ? await getPublicOrgTheme(target.organizationId) : null;
  if (!club || club.theme.isDefault) return {};
  return brandPageAccentStyle(effectivePalettes(club.theme).light.accent) as React.CSSProperties;
}

/** ?via= from a guest's invite link (one value, the code's own shape). */
function viaParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" && /^[a-z0-9]{6,12}$/.test(value) ? value : null;
}

/** Who the page says is hosting: the club. */
function hostLabel(page: RsvpPageData): string {
  return page.org.name;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/e/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await load(slug, viaParam((await searchParams).via));
  if (!page) return { title: "Event not found", robots: { index: false } };
  const when = `${dateLine(page.startsAt, page.timeZone)}, ${timeLine(page.startsAt, page.endsAt, page.timeZone, page.allDay)}`;
  const description = `${when} · Hosted by ${hostLabel(page)}`;
  return {
    title: `${page.title} · ${hostLabel(page)}`,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title: page.title,
      description,
      url: appUrl(`/e/${slug}`),
      ...(page.cover ? { images: [{ url: page.cover.s960, width: 960, height: 960 }] } : {}),
    },
    // Without this, X shows the site-wide card instead of the event's cover.
    ...(page.cover ? { twitter: { card: "summary_large_image", images: [page.cover.s960] } } : {}),
  };
}

export default async function RsvpPage({ params, searchParams }: PageProps<"/e/[slug]">) {
  const { slug } = await params;
  const via = viaParam((await searchParams).via);
  const page = await load(slug, via);
  // A real 404 (not-found.tsx), so link checkers and crawlers see it's gone.
  if (!page) notFound();
  const viewer = page.viewer;
  const going = viewer?.status === "GOING";

  const tone = page.background.tone;
  const accentStyle = await clubAccentStyle(slug);
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
        style={accentStyle}
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
            <Capacity page={page} />
            <div className="hidden flex-col gap-8 md:flex">{hostedAndGuests}</div>
          </aside>

          <div className="flex min-w-0 flex-col gap-7">
            <div className="flex flex-col gap-5">
              {page.invitedBy && !viewer && (
                <p className="m-0 inline-flex w-fit items-center gap-2 rounded-full border border-(--rsvp-tile-line) bg-(--rsvp-tile) py-1 pr-3.5 pl-1 text-[14px] font-semibold">
                  <span
                    className={cn(
                      "grid size-7 place-items-center rounded-full text-[11px] font-bold",
                      avatarTone(page.invitedBy),
                    )}
                  >
                    {initials(page.invitedBy)}
                  </span>
                  {page.invitedBy} invited you
                </p>
              )}
              <h1 className="font-heading text-[clamp(34px,5.4vw,54px)] leading-[1.02] tracking-[-0.03em] text-balance break-words">
                {page.title}
              </h1>

              <div className="flex flex-col gap-3.5">
                <InfoRow
                  tile={
                    <span className="rounded-tile flex w-12 flex-col overflow-hidden border border-(--rsvp-tile-line) bg-(--rsvp-tile) text-center">
                      <span className="bg-banana text-banana-ink py-[2px] text-[11px] font-semibold lowercase first-letter:uppercase">
                        {tile.month}
                      </span>
                      <span className="font-heading py-0.5 text-[20px] leading-7">{tile.day}</span>
                    </span>
                  }
                  title={dateLine(page.startsAt, page.timeZone)}
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
                {page.cost && (
                  <InfoRow
                    tile={<IconTile icon={<Banknote className="size-5" aria-hidden="true" />} />}
                    title={page.cost.line}
                    detail={[
                      page.cost.note,
                      page.cost.payWith.length > 0
                        ? `Pay the host with ${page.cost.payWith.join(" or ")}`
                        : "Settle up with the host",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                )}
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
                allDay: page.allDay,
                timeZone: page.timeZone,
                details: appUrl(`/e/${page.slug}`),
                location: page.location,
              })}
              icsUrl={`/e/${page.slug}/calendar.ics`}
              via={via}
              cost={
                page.cost
                  ? {
                      mode: page.cost.mode,
                      shareIfJoining: page.cost.shareIfJoining,
                      payWith: page.cost.payWith,
                    }
                  : null
              }
              signedExtras={
                viewer ? (
                  <>
                    {viewer.owes !== null && page.cost && (
                      <ChipIn
                        slug={page.slug}
                        owes={viewer.owes}
                        note={page.cost.note}
                        split={page.cost.mode === "SPLIT"}
                        payLinks={viewer.payLinks}
                        paid={viewer.paid}
                      />
                    )}
                    {going && !page.ended && (
                      <TicketStub
                        ticketUrl={viewer.ticketUrl}
                        checkedIn={viewer.checkedIn}
                        qr={
                          <QrCode
                            value={viewer.ticketUrl}
                            label="Your ticket"
                            className="size-full"
                          />
                        }
                      />
                    )}
                    {!page.ended && (
                      <InviteFriends
                        inviteUrl={viewer.inviteUrl}
                        invitedCount={viewer.invitedCount}
                        title={page.title}
                      />
                    )}
                  </>
                ) : null
              }
            />

            {page.items.length > 0 && (
              <Section title="Bring list">
                <BringList
                  slug={page.slug}
                  items={page.items}
                  canClaim={Boolean(viewer) && !page.ended}
                />
              </Section>
            )}

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
                    <div className="rounded-tile flex gap-3 border border-(--rsvp-tile-line) bg-(--rsvp-tile) p-4">
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
                      <MapEmbed
                        title={`Map of ${place?.venue ?? "the location"}`}
                        src={mapsEmbedUrl(page.location)}
                      />
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

        <HostYourOwn />

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

/**
 * The goal block: how full the event is, as a gauge. Only with a cap, and
 * only when the host shows the count.
 */
function Capacity({ page }: { page: RsvpPageData }) {
  if (!page.capacity || page.going === null) return null;
  const left = Math.max(0, page.capacity - page.going);
  return (
    <BlockCard
      tone="goal"
      kicker={page.ended ? "Ended" : left === 0 ? "Full" : "Spots"}
      title={left === 0 ? "Every spot is taken" : `${left} ${left === 1 ? "spot" : "spots"} left`}
      figure={page.going}
      figureLabel={`of ${page.capacity} going${page.waitlisting ? ` · ${page.waitlisting} waitlisted` : ""}`}
      aside={<Gauge value={(page.going / page.capacity) * 100} size={132} />}
      className="min-h-0 max-md:max-w-[440px]"
    />
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
        className="shadow-float rounded-block aspect-square w-full object-cover ring-1 ring-(--rsvp-tile-line) max-md:max-w-[440px]"
      />
    );
  }
  // No cover yet: the event's initial on a flat accent square.
  return (
    <div
      aria-hidden="true"
      className="bg-banana rounded-block grid aspect-square w-full place-items-center overflow-hidden max-md:max-w-[440px]"
    >
      <span className="font-heading text-banana-ink text-[120px] leading-none tracking-[-0.05em]">
        {page.title.trim()[0]?.toUpperCase() ?? "B"}
      </span>
    </div>
  );
}

function IconTile({ icon }: { icon: React.ReactNode }) {
  return (
    <span className="grid size-12 place-items-center rounded-full border border-(--rsvp-tile-line) bg-(--rsvp-tile) text-(--rsvp-soft)">
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
      <h2 className="m-0 text-[17px] font-semibold text-(--rsvp-fg)">{title}</h2>
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

/** Faces in the stack before "+N" (three, as everywhere). */
const AVATARS = 3;
/** Names in the list before "See everyone". */
const LISTED = 6;

function GuestRow({ guest }: { guest: RsvpGuest }) {
  return (
    <li className="flex min-h-9 items-center gap-3">
      <span
        aria-hidden="true"
        className={cn(
          "grid size-8 flex-none place-items-center rounded-full text-[11px] font-bold",
          guest.tone,
        )}
      >
        {guest.initials}
      </span>
      <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{guest.name}</span>
      {guest.instagramUrl && <InstagramLink url={guest.instagramUrl} name={guest.name} />}
    </li>
  );
}

function Guests({ page }: { page: RsvpPageData }) {
  if (page.going === null) return null;
  const guests = page.guests ?? [];
  const shown = guests.slice(0, LISTED);
  const rest = guests.slice(LISTED);
  const heading =
    page.going === 0
      ? "Be the first to sign up"
      : `${page.going} going${page.waitlisting ? ` · ${page.waitlisting} waitlisted` : ""}`;
  return (
    <Section title={heading}>
      {page.going > 0 && page.guests && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center" aria-hidden="true">
            {guests.slice(0, AVATARS).map((g, i) => (
              <span
                key={i}
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
          {/* One name a line, in full, with their Instagram when they shared it. */}
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {shown.map((g, i) => (
              <GuestRow key={i} guest={g} />
            ))}
          </ul>
          {(rest.length > 0 || page.going > guests.length) && (
            <details className="group">
              <summary className="cursor-pointer list-none text-[14px] font-semibold text-(--rsvp-fg) [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">See everyone ({page.going})</span>
                <span className="hidden group-open:inline">Show fewer</span>
              </summary>
              <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0">
                {rest.map((g, i) => (
                  <GuestRow key={i} guest={g} />
                ))}
                {page.going > guests.length && (
                  <li className="text-[14px] text-(--rsvp-muted)">
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
