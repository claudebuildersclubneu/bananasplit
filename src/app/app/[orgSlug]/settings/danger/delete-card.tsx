"use client";

import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { scheduleDeletionAction } from "./actions";

export function DeleteCard({
  orgId,
  orgName,
  slug,
  personal = false,
}: {
  orgId: string;
  orgName: string;
  slug: string;
  /** A Personal space: it's yours alone, so the copy says so. */
  personal?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await scheduleDeletionAction(orgId, typed);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <section
      className="border-destructive/40 space-y-3 rounded-lg border p-4"
      aria-labelledby="delete-heading"
    >
      <div>
        <h2 id="delete-heading" className="text-destructive font-medium">
          {personal ? "Delete your Personal space" : "Delete this club"}
        </h2>
        {personal ? (
          <p className="text-muted-foreground text-sm">
            Your Personal space closes at once and is deleted for good after 30 days: your tasks,
            calendar, polls and event pages, with their RSVPs and answers. Your account and your
            clubs aren&apos;t affected. You can cancel during those 30 days from its page. Export
            your data first if you need it.
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            The club closes for everyone at once and is deleted for good after 30 days: members,
            tasks, notes, events, finance records, files, integrations and settings. An owner can
            cancel during those 30 days from the club&apos;s page. Its URL is never reused. Export
            your data first if you need it.
          </p>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive">{personal ? "Delete Personal" : "Delete club"}</Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {personal ? "Delete your Personal space?" : `Delete ${orgName}?`}
              </DialogTitle>
              <DialogDescription>
                Type <span className="text-foreground font-mono">{slug}</span> to confirm.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
              <Label htmlFor="confirm-slug">{personal ? "Its URL" : "Club URL"}</Label>
              <Input
                id="confirm-slug"
                autoComplete="off"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={slug}
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isPending || typed.trim() !== slug}
              >
                {isPending ? "Deleting…" : personal ? "Delete Personal" : "Delete club"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
