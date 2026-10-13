"use client";

import { Building2, Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { saveFreeEventToClub, startClubForFreeEvent } from "@/app/rsvp/actions";
import { ArrowRight } from "@/components/brand/arrows";
import { FormMessage } from "@/components/brand/fields";
import { pill } from "@/components/brand/pill";
import { cn } from "@/lib/utils";

/** The clubs the person runs, each a "Move it here", and starting a new one. */
export function SaveToClub({
  eventId,
  clubs,
}: {
  eventId: string;
  clubs: { id: string; name: string }[];
}) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function move(orgId: string) {
    setError(null);
    setBusy(orgId);
    start(async () => {
      const result = await saveFreeEventToClub(eventId, orgId);
      setBusy(null);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {clubs.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-ink-soft m-0 text-[13px] font-bold tracking-[0.06em] uppercase">
            Clubs you run
          </h2>
          {clubs.map((club) => (
            <div
              key={club.id}
              className="border-ink/10 bg-paper flex items-center gap-3 rounded-2xl border px-4 py-3"
            >
              <span className="bg-ink text-cream font-heading grid size-10 flex-none place-items-center rounded-xl text-[17px]">
                {club.name.trim()[0]?.toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-[16px] font-semibold">{club.name}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => move(club.id)}
                className={pill({ size: "sm" })}
              >
                {busy === club.id ? "Moving…" : "Move it here"}
              </button>
            </div>
          ))}
        </section>
      )}

      <form
        action={startClubForFreeEvent.bind(null, eventId)}
        className={cn(
          "border-ink/10 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-4",
          clubs.length === 0 ? "bg-ink text-cream border-ink" : "bg-paper",
        )}
      >
        <span
          className={cn(
            "grid size-10 flex-none place-items-center rounded-xl",
            clubs.length === 0 ? "bg-banana text-ink" : "bg-oat",
          )}
        >
          {clubs.length === 0 ? (
            <Building2 className="size-5" aria-hidden="true" />
          ) : (
            <Plus className="size-5" aria-hidden="true" />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[16px] font-semibold">Start a new club</span>
          <span
            className={cn("text-[14px]", clubs.length === 0 ? "text-dusk-light" : "text-ink-muted")}
          >
            Set it up in a few steps; this event moves in when it&apos;s made.
          </span>
        </span>
        <button
          type="submit"
          className={cn(
            pill({ size: "sm" }),
            clubs.length === 0 && "bg-banana text-ink hover:bg-lemon hover:text-ink",
          )}
        >
          Start a club
          <ArrowRight />
        </button>
      </form>
      {error && <FormMessage>{error}</FormMessage>}
    </div>
  );
}
