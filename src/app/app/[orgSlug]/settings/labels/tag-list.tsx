"use client";

import { Combine, Palette, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ItemMenu } from "@/components/item-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TagChip } from "@/components/ui/chip";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { nearDuplicateGroups } from "@/lib/tasks/tags";
import { cn } from "@/lib/utils";

import { deleteLabel, mergeLabels, updateLabel } from "./actions";

export interface TagRow {
  id: string;
  name: string;
  color: string;
  /** Tasks it is on (that the viewer can see). */
  uses: number;
}

const uses = (n: number) => `${n} task${n === 1 ? "" : "s"}`;

/**
 * The club's tags: rename, recolour, merge one into another, delete. Tags
 * that look like the same one ("Design", "designs") get a merge suggestion
 * above the list.
 */
export function TagList({
  orgId,
  tags,
  colors,
}: {
  orgId: string;
  tags: TagRow[];
  colors: string[];
}) {
  const router = useRouter();
  const [merging, setMerging] = useState<TagRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const suggestions = nearDuplicateGroups(tags);

  function mergeGroup(group: TagRow[]) {
    // Keep the most used; fold the rest into it.
    const [keep, ...rest] = [...group].sort((a, b) => b.uses - a.uses);
    startTransition(async () => {
      for (const tag of rest) {
        const result = await mergeLabels(orgId, tag.id, keep!.id);
        if ("error" in result && result.error) {
          toast({ title: result.error, tone: "error" });
          return;
        }
      }
      toast({ title: `Merged into “${keep!.name}”`, tone: "success" });
      router.refresh();
    });
  }

  if (tags.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No tags yet. Add one here, or type one on any task.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {suggestions.map((group) => (
        <div
          key={group.map((t) => t.id).join("-")}
          className="bg-tint-info text-tint-info-foreground rounded-tile flex flex-wrap items-center gap-2 px-4 py-3 text-sm"
        >
          <span className="flex flex-wrap items-center gap-1.5">
            {group.map((t) => (
              <TagChip key={t.id} color={t.color}>
                {t.name}
              </TagChip>
            ))}
          </span>
          <span className="min-w-0 flex-1">look like the same tag.</span>
          <Button
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() => mergeGroup(group)}
          >
            <Combine className="size-4" aria-hidden="true" />
            Merge them
          </Button>
        </div>
      ))}

      <ul className="bg-card edge rounded-card p-2" aria-label="Tags">
        {tags.map((tag) => (
          <TagListRow
            key={tag.id}
            orgId={orgId}
            tag={tag}
            colors={colors}
            onMerge={() => setMerging(tag)}
          />
        ))}
      </ul>

      {merging && (
        <MergeDialog
          orgId={orgId}
          source={merging}
          tags={tags.filter((t) => t.id !== merging.id)}
          onClose={() => setMerging(null)}
        />
      )}
    </div>
  );
}

function TagListRow({
  orgId,
  tag,
  colors,
  onMerge,
}: {
  orgId: string;
  tag: TagRow;
  colors: string[];
  onMerge: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "rename" | "color">("view");
  const [name, setName] = useState(tag.name);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmEl, confirm] = useConfirm();

  function save(input: { name?: string; color?: string }) {
    setError(null);
    startTransition(async () => {
      const result = await updateLabel(orgId, tag.id, input);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setMode("view");
      router.refresh();
    });
  }

  async function remove() {
    const ok = await confirm({
      title: `Delete the tag “${tag.name}”?`,
      description: `It comes off ${uses(tag.uses)}. The tasks stay.`,
      confirmLabel: "Delete tag",
      run: async () => {
        const result = await deleteLabel(orgId, tag.id);
        return result && "error" in result ? result.error : undefined;
      },
    });
    if (ok) router.refresh();
  }

  return (
    <li className="hover:bg-muted/60 rounded-tile [&+&]:before:bg-border relative px-3 py-2.5 transition-colors [&+&]:before:absolute [&+&]:before:inset-x-3 [&+&]:before:top-0 [&+&]:before:h-px">
      <div className="flex min-h-9 items-center gap-3">
        {mode === "rename" ? (
          <form
            className="flex flex-1 flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              save({ name });
            }}
          >
            <Input
              aria-label={`New name for ${tag.name}`}
              value={name}
              autoFocus
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              className="h-8 w-56"
            />
            <Button type="submit" size="sm" disabled={isPending || !name.trim()}>
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => (setMode("view"), setName(tag.name), setError(null))}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <>
            <TagChip color={tag.color}>{tag.name}</TagChip>
            <Badge variant="secondary">{uses(tag.uses)}</Badge>
            <span className="flex-1" />
            <ItemMenu
              label={`Actions for ${tag.name}`}
              items={[
                { label: "Rename", icon: Pencil, onSelect: () => setMode("rename") },
                { label: "Recolour", icon: Palette, onSelect: () => setMode("color") },
                { label: "Merge into…", icon: Combine, onSelect: onMerge },
                {
                  label: "Delete",
                  icon: Trash2,
                  destructive: true,
                  separated: true,
                  onSelect: () => void remove(),
                },
              ]}
            />
          </>
        )}
      </div>
      {mode === "color" && (
        <div
          className="flex flex-wrap items-center gap-2 pt-2 pb-1"
          role="group"
          aria-label="Colour"
        >
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Colour ${c}`}
              aria-pressed={tag.color === c}
              disabled={isPending}
              onClick={() => save({ color: c })}
              className={cn(
                "focus-glow size-7 rounded-full transition-transform active:scale-[0.94]",
                tag.color.toLowerCase() === c &&
                  "ring-foreground ring-offset-card ring-2 ring-offset-2",
              )}
              style={{ background: c }}
            />
          ))}
          <Button size="sm" variant="ghost" onClick={() => setMode("view")}>
            Done
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-destructive pt-1 text-xs">
          {error}
        </p>
      )}
      {confirmEl}
    </li>
  );
}

function MergeDialog({
  orgId,
  source,
  tags,
  onClose,
}: {
  orgId: string;
  source: TagRow;
  tags: TagRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [targetId, setTargetId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const target = tags.find((t) => t.id === targetId);

  function merge() {
    if (!target) return;
    setError(null);
    startTransition(async () => {
      const result = await mergeLabels(orgId, source.id, target.id);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      toast({ title: `Merged “${source.name}” into “${target.name}”`, tone: "success" });
      router.refresh();
      onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Merge “{source.name}”</DialogTitle>
          <DialogDescription>
            Its {uses(source.uses)} get the tag you pick, then “{source.name}” is deleted.
          </DialogDescription>
        </DialogHeader>
        <Select value={targetId} onValueChange={setTargetId}>
          <SelectTrigger aria-label="Merge into" className="w-full">
            <SelectValue placeholder="Merge into…" />
          </SelectTrigger>
          <SelectContent>
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={merge} disabled={!target || isPending}>
            {isPending ? "Merging…" : target ? `Merge into “${target.name}”` : "Merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
