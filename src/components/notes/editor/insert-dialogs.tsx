"use client";

import { Database, Loader2, Search, Vote } from "lucide-react";
import { useEffect, useState } from "react";

import { listEmbedTargets, type EmbedTarget } from "@/app/app/[orgSlug]/notes/embed-actions";
import { createTask } from "@/app/app/[orgSlug]/tasks/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayKey } from "@/lib/notes/dates";
import { parseDueText } from "@/lib/tasks/due-text";

/**
 * The slash menu's dialogs for live pieces: a new task (made on the club's
 * board, then dropped in as a chip), and the database or poll a link card
 * opens.
 */

export function TaskInsertDialog({
  orgId,
  open,
  initialTitle,
  onClose,
  onCreated,
}: {
  orgId: string;
  open: boolean;
  initialTitle: string;
  onClose: () => void;
  onCreated: (task: { id: string; title: string }) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setDue("");
      setError(null);
    }
  }, [open, initialTitle]);

  const dueKey = due.trim() ? parseDueText(due, todayKey()) : null;

  async function submit() {
    if (!title.trim()) return;
    if (due.trim() && !dueKey) {
      setError("Try a date like “Fri”, “Oct 21” or “in 3 days”.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = (await createTask(orgId, {
        title: title.trim(),
        ...(dueKey ? { dueDate: dueKey } : {}),
      })) as { error?: string; taskId?: string };
      if (result.error || !result.taskId) {
        setError(result.error ?? "The task couldn't be made.");
        return;
      }
      onCreated({ id: result.taskId, title: title.trim() });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>
            It goes on the club&apos;s task board and shows here as a chip you can check off.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="note-task-title">Task</Label>
            <Input
              id="note-task-title"
              autoFocus
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Book a photographer"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="note-task-due">Due (optional)</Label>
            <Input
              id="note-task-due"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              placeholder="Fri, Oct 21, in 3 days…"
            />
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !title.trim()}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Add task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EmbedPickerDialog({
  orgId,
  kind,
  onClose,
  onPick,
}: {
  orgId: string;
  kind: "database" | "poll" | null;
  onClose: () => void;
  onPick: (target: EmbedTarget) => void;
}) {
  const [targets, setTargets] = useState<EmbedTarget[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!kind) return;
    let live = true;
    setQ("");
    void listEmbedTargets(orgId).then((r) => {
      if (live) setTargets("targets" in r ? r.targets : []);
    });
    return () => {
      live = false;
    };
  }, [kind, orgId]);

  const shown = (targets ?? [])
    .filter((t) => t.kind === kind)
    .filter((t) => t.title.toLowerCase().includes(q.trim().toLowerCase()));
  const Icon = kind === "poll" ? Vote : Database;
  const noun = kind === "poll" ? "poll" : "database";

  return (
    <Dialog open={kind !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{kind === "poll" ? "Add a poll" : "Add a database view"}</DialogTitle>
          <DialogDescription>
            A card in the note that opens the {noun}. Readers see it only if they can open it.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Find a ${noun}`}
            aria-label={`Find a ${noun}`}
            className="pl-9"
          />
        </div>
        <ul className="-mx-1 max-h-72 space-y-0.5 overflow-y-auto">
          {targets === null ? (
            <li className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading…
            </li>
          ) : shown.length === 0 ? (
            <li className="text-muted-foreground px-3 py-2 text-sm">
              {q ? "Nothing matches." : `This club has no ${noun}s yet.`}
            </li>
          ) : (
            shown.map((t) => (
              <li key={t.path}>
                <button
                  type="button"
                  onClick={() => onPick(t)}
                  className="hover:bg-muted flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm"
                >
                  <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{t.title}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
