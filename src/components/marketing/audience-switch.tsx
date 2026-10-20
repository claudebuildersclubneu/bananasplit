"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type Audience = "personal" | "teams";

const OPTIONS: readonly { id: Audience; label: string }[] = [
  { id: "personal", label: "Personal" },
  { id: "teams", label: "Teams" },
];

/**
 * The pricing section's Personal / Teams switch: a pill track with a thumb
 * that slides to the chosen side, and the matching plans below. Both panels
 * are rendered on the server and passed in; the one not chosen is hidden,
 * so the page works (Teams shows) before JavaScript runs.
 */
export function AudienceSwitch({
  personal,
  teams,
  initial = "teams",
}: {
  personal: ReactNode;
  teams: ReactNode;
  initial?: Audience;
}) {
  const [audience, setAudience] = useState<Audience>(initial);
  const index = OPTIONS.findIndex((o) => o.id === audience);

  return (
    <>
      <div
        role="group"
        aria-label="Plans for"
        className="bg-sand relative mx-auto grid w-[min(100%,300px)] grid-cols-2 rounded-full p-1"
      >
        <span
          aria-hidden="true"
          className="bg-paper shadow-segment absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-(--ease-spring) motion-reduce:transition-none"
          style={{ transform: `translateX(${index * 100}%)` }}
        />
        {OPTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={audience === id}
            onClick={() => setAudience(id)}
            className={cn(
              "relative z-10 h-10 cursor-pointer rounded-full text-[15px] font-semibold transition-colors",
              audience === id ? "text-ink" : "text-ink-soft hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div hidden={audience !== "personal"} className="flex flex-col gap-8 sm:gap-12">
        {personal}
      </div>
      <div hidden={audience !== "teams"} className="flex flex-col gap-8 sm:gap-12">
        {teams}
      </div>
    </>
  );
}
