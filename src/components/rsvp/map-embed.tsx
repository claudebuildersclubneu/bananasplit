"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";

import { pill } from "@/components/brand/pill";

/**
 * The event's map, loaded only when a guest asks for it. The Google Maps
 * embed pulls in well over a megabyte of scripts, and loading it on every
 * view would also tell Google about every visitor; most guests only need
 * the address and the "Open in Google Maps" link beside it.
 */
export function MapEmbed({ src, title }: { src: string; title: string }) {
  const [shown, setShown] = useState(false);

  if (shown) {
    return (
      <div className="border-border rounded-tile overflow-hidden border bg-(--rsvp-tile)">
        <iframe
          title={title}
          src={src}
          referrerPolicy="no-referrer-when-downgrade"
          className="block h-[240px] w-full border-0 sm:h-[280px]"
        />
      </div>
    );
  }
  return (
    <div className="rounded-tile flex h-[120px] flex-col items-center justify-center gap-2 border border-(--rsvp-tile-line) bg-(--rsvp-tile)">
      <MapPin className="size-5 text-(--rsvp-soft)" aria-hidden="true" />
      <button
        type="button"
        onClick={() => setShown(true)}
        className={pill({ tone: "outline", size: "sm" })}
      >
        Show the map
      </button>
    </div>
  );
}
