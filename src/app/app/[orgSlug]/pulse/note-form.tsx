"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";

import { savePulseNoteAction } from "./actions";

/** An admin's note on this week's pulse, before it goes out. */
export function PulseNoteForm({
  orgId,
  issueId,
  initial,
  sendsAt,
}: {
  orgId: string;
  issueId: string;
  initial: string | null;
  /** "Fri, Oct 23 at 5:00 PM". */
  sendsAt: string;
}) {
  const [note, setNote] = useState(initial ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const result = await savePulseNoteAction(orgId, { issueId, note });
          if (!result.ok) setError(result.error ?? "That note couldn't be saved.");
          else toast({ title: note.trim() ? "Note saved" : "Note removed", tone: "success" });
        });
      }}
    >
      <label htmlFor="pulse-note" className="heading block text-[15px]">
        A note from the officers
      </label>
      <p className="text-muted-foreground text-sm">
        Shown at the top of the pulse. It goes out {sendsAt}.
      </p>
      <Textarea
        id="pulse-note"
        value={note}
        maxLength={1000}
        rows={3}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Venue tour done: the ballroom it is. Photographer quotes are due Friday."
      />
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save note"}
        </Button>
        <span className="text-muted-foreground text-[13px] tabular-nums">{note.length}/1000</span>
      </div>
    </form>
  );
}
