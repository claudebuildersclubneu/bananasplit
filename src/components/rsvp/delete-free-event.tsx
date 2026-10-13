"use client";

import { useState, useTransition } from "react";

import { deleteFreeEvent } from "@/app/rsvp/actions";
import { FormMessage } from "@/components/brand/fields";
import { pill } from "@/components/brand/pill";
import { cn } from "@/lib/utils";

/** Deleting a free event, with a second tap to confirm. Guests are told it's off. */
export function DeleteFreeEvent({ eventId, title }: { eventId: string; title: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="border-ink/10 flex flex-col gap-3 rounded-[20px] border p-5">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-[16px] font-bold">Delete this event</h2>
        <p className="text-ink-muted m-0 text-[14px]">
          The page stops working and everyone signed up gets an email that {title} is cancelled.
        </p>
      </div>
      {confirming ? (
        <div className="flex flex-wrap gap-2">
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
            onClick={() =>
              start(async () => {
                setError(null);
                const result = await deleteFreeEvent(eventId);
                if (result?.error) setError(result.error);
              })
            }
            className={cn(pill({ size: "sm" }), "bg-brick hover:bg-brick/90")}
          >
            {pending ? "Deleting…" : "Yes, delete and tell guests"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={cn(pill({ tone: "outline", size: "sm" }), "text-brick w-fit")}
        >
          Delete event
        </button>
      )}
      {error && <FormMessage>{error}</FormMessage>}
    </section>
  );
}
