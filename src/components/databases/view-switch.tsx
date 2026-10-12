"use client";

import { Segmented } from "@/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useViewParams } from "./view-params";

/** The view switch (Segmented) that sets ?view= on the current URL; the first view is the default. */
export function ViewSwitch({
  views,
  current,
}: {
  views: { key: string; label: string }[];
  current: string;
}) {
  const view = useViewParams();
  return (
    <Segmented
      label="View"
      value={current}
      options={views.map((v) => ({ value: v.key, label: v.label }))}
      onSelect={(key) =>
        view.update((p) => {
          p.delete("sort");
          p.delete("cols");
          if (key === views[0].key) p.delete("view");
          else p.set("view", key);
        })
      }
    />
  );
}

/** Radix Select has no empty value; this stands for "All polls". */
const ALL = "__all";

/** Picks the poll: writes f=ballotDefinitionId:eq:<id> (the report deep-link grammar). */
export function PollPicker({
  polls,
  current,
  allowAll = false,
}: {
  polls: { id: string; title: string; isTest: boolean }[];
  current: string | null;
  allowAll?: boolean;
}) {
  const view = useViewParams();
  return (
    <Select
      value={current ?? (allowAll ? ALL : undefined)}
      onValueChange={(value) =>
        view.update((p) => {
          const rest = p
            .getAll("f")
            .filter((f) => !/^(ballotDefinitionId|poll|definition|pollSlug|slug):/.test(f));
          p.delete("f");
          for (const f of rest) p.append("f", f);
          if (value !== ALL) p.append("f", `ballotDefinitionId:eq:${value}`);
        })
      }
    >
      <SelectTrigger size="sm" aria-label="Poll" className="max-w-64">
        <SelectValue placeholder="Choose a poll" />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value={ALL}>All polls</SelectItem>}
        {polls.map((poll) => (
          <SelectItem key={poll.id} value={poll.id}>
            {poll.title}
            {poll.isTest ? " (test)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
