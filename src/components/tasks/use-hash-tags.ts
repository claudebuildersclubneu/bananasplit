"use client";

import { useCallback } from "react";

import { createTag } from "@/app/app/[orgSlug]/settings/labels/actions";
import { extractHashTags, findTag } from "@/lib/tasks/tags";

import { useTasks } from "./tasks-context";

export interface HashTagPreview {
  name: string;
  /** Not a tag yet: saving makes it (when the viewer may). */
  isNew: boolean;
}

/**
 * `#tag` in a title (the composer, the quick add): what it would tag, and a
 * resolver that turns the title into the real title plus tag ids, making
 * the new tags on the way. A tag the viewer may not make stays in the title
 * as typed, so nothing they wrote disappears.
 */
export function useHashTags() {
  const { org, labels, can, addLabel } = useTasks();

  const preview = useCallback(
    (title: string): HashTagPreview[] =>
      extractHashTags(title)
        .tags.map((name) => ({ name, isNew: !findTag(labels, name) }))
        .filter((t) => !t.isNew || can.createTags),
    [labels, can.createTags],
  );

  const resolve = useCallback(
    async (title: string): Promise<{ title: string; labelIds: string[]; error?: string }> => {
      const { tags } = extractHashTags(title);
      if (tags.length === 0) return { title, labelIds: [] };
      const ids: string[] = [];
      const taken = new Set<string>();
      let error: string | undefined;
      for (const name of tags) {
        const existing = findTag(labels, name);
        if (existing) {
          ids.push(existing.id);
          taken.add(name.toLocaleLowerCase());
          continue;
        }
        if (!can.createTags) continue;
        const result = await createTag(org.id, { name });
        if ("error" in result) {
          error = result.error;
          continue;
        }
        addLabel(result.tag);
        ids.push(result.tag.id);
        taken.add(name.toLocaleLowerCase());
      }
      const stripped = extractHashTags(title, taken).title;
      return { title: stripped || title, labelIds: ids, error };
    },
    [org.id, labels, can.createTags, addLabel],
  );

  return { preview, resolve };
}
