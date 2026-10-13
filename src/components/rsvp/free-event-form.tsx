"use client";

import { Video } from "lucide-react";
import { useActionState, useState } from "react";

import type { FreeEventState } from "@/app/rsvp/actions";
import { BrandField, BrandInput, FormMessage } from "@/components/brand/fields";
import { pill } from "@/components/brand/pill";
import { cn } from "@/lib/utils";

/**
 * A free event's details (/rsvp/new and /rsvp/{id}/edit): name, when,
 * where, and a description. Times are the host's wall clock; the browser's
 * timezone is added when the form is sent, so the first event sets the
 * space's zone.
 */

export interface FreeEventValues {
  title: string;
  /** "YYYY-MM-DDTHH:mm" in the space's timezone. */
  startsAt: string;
  endsAt: string;
  location: string;
  conferenceUrl: string;
  description: string;
}

const textareaClass =
  "bg-paper border-ink/16 focus-banana w-full rounded-xl border px-4 py-3 text-[15px] leading-[1.5] outline-none transition-shadow";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** A wall-clock "YYYY-MM-DDTHH:mm", read and written without any timezone. */
function wallValue(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function wallMs(value: string): number {
  return Date.parse(`${value}:00Z`);
}

/** Keeps the end after the start: two hours on when the start moves past it. */
function nudgeEnd(startsAt: string, endsAt: string): string {
  const s = wallMs(startsAt);
  const e = wallMs(endsAt);
  if (Number.isNaN(s)) return endsAt;
  if (!Number.isNaN(e) && e > s) return endsAt;
  return wallValue(s + 2 * 60 * 60 * 1000);
}

export function FreeEventForm({
  action,
  initial,
  creating = false,
  submitLabel,
  pendingLabel,
}: {
  action: (prev: FreeEventState, form: FormData) => Promise<FreeEventState>;
  /** The values to start from; a new event starts with only its times. */
  initial: FreeEventValues;
  /** A new event (focuses the name). */
  creating?: boolean;
  submitLabel: string;
  pendingLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [times, setTimes] = useState({ startsAt: initial.startsAt, endsAt: initial.endsAt });
  const [online, setOnline] = useState(Boolean(initial.conferenceUrl));
  // Controlled, so an error from the server doesn't wipe what was typed
  // (React resets a form's uncontrolled fields after every action).
  const [text, setText] = useState({
    title: initial.title,
    location: initial.location,
    conferenceUrl: initial.conferenceUrl,
    description: initial.description,
  });
  const bind = (field: keyof typeof text) => ({
    value: text[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setText((t) => ({ ...t, [field]: e.target.value })),
  });

  function submit(form: FormData) {
    form.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");
    formAction(form);
  }

  const invalid = (field: FreeEventState["field"]) => (state.field === field ? true : undefined);

  return (
    <form action={submit} className="flex flex-col gap-5">
      <BrandField id="ev-title" label="Event name">
        <BrandInput
          id="ev-title"
          name="title"
          required
          maxLength={200}
          {...bind("title")}
          placeholder="Pizza & board games"
          className="h-12 text-[17px]"
          aria-invalid={invalid("title")}
          autoFocus={creating}
        />
      </BrandField>

      <div className="grid gap-4 sm:grid-cols-2">
        <BrandField id="ev-start" label="Starts">
          <BrandInput
            id="ev-start"
            name="startsAt"
            type="datetime-local"
            required
            value={times.startsAt}
            onChange={(e) =>
              setTimes((t) => ({
                startsAt: e.target.value,
                endsAt: nudgeEnd(e.target.value, t.endsAt),
              }))
            }
            className="h-12"
            aria-invalid={invalid("startsAt")}
          />
        </BrandField>
        <BrandField id="ev-end" label="Ends">
          <BrandInput
            id="ev-end"
            name="endsAt"
            type="datetime-local"
            required
            value={times.endsAt}
            onChange={(e) => setTimes((t) => ({ ...t, endsAt: e.target.value }))}
            className="h-12"
            aria-invalid={invalid("endsAt")}
          />
        </BrandField>
      </div>

      <BrandField id="ev-location" label="Where">
        <BrandInput
          id="ev-location"
          name="location"
          maxLength={300}
          {...bind("location")}
          placeholder="Curry Student Center 342, 360 Huntington Ave"
          className="h-12"
          aria-invalid={invalid("location")}
        />
      </BrandField>

      {online ? (
        <BrandField id="ev-online" label="Online link">
          <BrandInput
            id="ev-online"
            name="conferenceUrl"
            type="url"
            maxLength={2000}
            {...bind("conferenceUrl")}
            placeholder="https://zoom.us/j/…"
            className="h-12"
            aria-invalid={invalid("conferenceUrl")}
          />
        </BrandField>
      ) : (
        <button
          type="button"
          onClick={() => setOnline(true)}
          className="text-ink-muted hover:text-ink flex w-fit items-center gap-2 text-[14px] font-semibold"
        >
          <Video className="size-4" aria-hidden="true" />
          Add an online link
        </button>
      )}

      <BrandField id="ev-description" label="What's it about? (optional)">
        <textarea
          id="ev-description"
          name="description"
          rows={4}
          maxLength={20_000}
          {...bind("description")}
          placeholder="Bring a game if you have one. We'll have pizza from 7."
          className={textareaClass}
        />
      </BrandField>

      {state.error && <FormMessage>{state.error}</FormMessage>}

      <button
        type="submit"
        disabled={pending}
        className={cn(pill({ size: "lg", raised: true }), "w-full")}
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
