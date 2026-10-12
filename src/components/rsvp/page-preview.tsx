import "@/app/e/rsvp.css";

import type { RsvpCover } from "@/lib/rsvp/cover";
import { resolveRsvpBackground } from "@/lib/rsvp/backgrounds";
import { cn } from "@/lib/utils";

/** A small picture of the public page: its background, cover and title. */
export function PagePreview({
  cover,
  background,
  title,
  className,
}: {
  cover: RsvpCover | null;
  background: string;
  title: string;
  className?: string;
}) {
  const resolved = resolveRsvpBackground(background, Boolean(cover));
  const bg = resolved.id;
  const dark = resolved.tone === "dark";
  return (
    <div
      aria-hidden="true"
      data-tone={dark ? "dark" : "light"}
      className={cn(
        "rsvp-page relative isolate flex aspect-[4/3] w-full flex-col gap-2 overflow-hidden rounded-xl border p-3",
        `rsvp-bg-${bg}`,
        className,
      )}
    >
      {bg === "cover" && cover && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- a stored WebP variant */}
          <img
            src={cover.s480}
            alt=""
            className="absolute inset-0 -z-10 size-full scale-125 object-cover blur-xl"
          />
          <span className="bg-night/60 absolute inset-0 -z-10" />
        </>
      )}
      <div className="flex gap-2.5">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- a stored WebP variant
          <img
            src={cover.s480}
            alt=""
            className="size-14 flex-none rounded-lg object-cover shadow-sm"
          />
        ) : (
          <span className="bg-peel font-heading text-ink grid size-14 flex-none place-items-center rounded-lg text-2xl">
            {title.trim()[0]?.toUpperCase() ?? "B"}
          </span>
        )}
        <span className="font-heading line-clamp-3 text-[15px] leading-tight text-(--rsvp-fg)">
          {title}
        </span>
      </div>
      <span className="bg-paper mt-auto h-9 rounded-lg shadow-sm" />
    </div>
  );
}
