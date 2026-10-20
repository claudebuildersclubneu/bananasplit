import { Extension } from "@tiptap/core";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import {
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
  ySyncPluginKey,
} from "@tiptap/y-tiptap";
import * as Y from "yjs";

import {
  anchorFor,
  findPassage,
  isTextAnchor,
  type Range,
  type TextAnchor,
} from "@/lib/notes/comment-anchor";

/**
 * Comment threads, highlighted where they sit (src/lib/notes/comment-anchor.ts):
 * Yjs relative positions in a live note, the quoted passage otherwise.
 * Decorations, never marks, so commenting doesn't change the note (and
 * people who can only view it can comment). The highlights follow local
 * edits through the transaction mapping and are found again after a remote
 * change or when the threads change.
 */

export interface HighlightThread {
  id: string;
  anchorText: string | null;
  anchor: unknown;
  resolved: boolean;
}

interface PluginState {
  threads: HighlightThread[];
  active: string | null;
  decorations: DecorationSet;
}

export const commentHighlightsKey = new PluginKey<PluginState>("noteCommentHighlights");

const SET_META = "noteCommentHighlightsSet";

interface YBinding {
  doc: Y.Doc;
  type: Y.XmlFragment;
  binding: { mapping: Map<unknown, unknown> };
}

function ySync(state: EditorState): YBinding | null {
  const value = ySyncPluginKey.getState(state) as Partial<YBinding> | undefined;
  return value?.doc && value.type && value.binding ? (value as YBinding) : null;
}

/** Where a thread is now, or null when its passage is gone. */
export function resolveThread(state: EditorState, thread: HighlightThread): Range | null {
  const anchor = isTextAnchor(thread.anchor) ? (thread.anchor as TextAnchor) : null;
  const y = ySync(state);
  if (y && anchor?.yjs) {
    try {
      const from = relativePositionToAbsolutePosition(
        y.doc,
        y.type,
        Y.createRelativePositionFromJSON(anchor.yjs.from),
        y.binding.mapping as never,
      );
      const to = relativePositionToAbsolutePosition(
        y.doc,
        y.type,
        Y.createRelativePositionFromJSON(anchor.yjs.to),
        y.binding.mapping as never,
      );
      if (from !== null && to !== null && to > from) return { from, to };
    } catch {
      // Fall through to the text.
    }
  }
  return thread.anchorText ? findPassage(state.doc, thread.anchorText, anchor) : null;
}

function build(state: EditorState, threads: HighlightThread[], active: string | null) {
  const decorations: Decoration[] = [];
  for (const thread of threads) {
    if (thread.resolved && thread.id !== active) continue;
    const range = resolveThread(state, thread);
    if (!range) continue;
    decorations.push(
      Decoration.inline(
        range.from,
        range.to,
        {
          class: thread.id === active ? "note-comment-hl is-active" : "note-comment-hl",
          "data-thread-id": thread.id,
        },
        { threadId: thread.id },
      ),
    );
  }
  return DecorationSet.create(state.doc, decorations);
}

function isRemote(tr: Transaction) {
  return Boolean(tr.getMeta(ySyncPluginKey));
}

/** The threads' current ranges, from the highlights (detached threads are absent). */
export function threadRanges(state: EditorState): Map<string, Range> {
  const ranges = new Map<string, Range>();
  const set = commentHighlightsKey.getState(state)?.decorations;
  for (const deco of set?.find() ?? []) {
    const id = (deco.spec as { threadId?: string }).threadId;
    if (!id) continue;
    const existing = ranges.get(id);
    ranges.set(id, {
      from: Math.min(existing?.from ?? deco.from, deco.from),
      to: Math.max(existing?.to ?? deco.to, deco.to),
    });
  }
  return ranges;
}

/** The anchor to store for a new thread on the current selection. */
export function anchorForSelection(state: EditorState): TextAnchor | null {
  const { from, to } = state.selection;
  if (from >= to) return null;
  const anchor = anchorFor(state.doc, from, to);
  const y = ySync(state);
  if (y) {
    try {
      anchor.yjs = {
        from: Y.relativePositionToJSON(
          absolutePositionToRelativePosition(from, y.type, y.binding.mapping as never),
        ),
        to: Y.relativePositionToJSON(
          absolutePositionToRelativePosition(to, y.type, y.binding.mapping as never),
        ),
      };
    } catch {
      // The text anchor alone.
    }
  }
  return anchor;
}

export function setHighlightThreads(
  tr: Transaction,
  threads: HighlightThread[],
  active: string | null,
): Transaction {
  return tr.setMeta(SET_META, { threads, active });
}

export const CommentHighlights = Extension.create<{
  onClickThread?: (id: string) => void;
}>({
  name: "commentHighlights",
  addOptions: () => ({ onClickThread: undefined }),
  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin<PluginState>({
        key: commentHighlightsKey,
        state: {
          init: () => ({ threads: [], active: null, decorations: DecorationSet.empty }),
          apply(tr, value, _old, newState) {
            const set = tr.getMeta(SET_META) as
              | { threads: HighlightThread[]; active: string | null }
              | undefined;
            if (set) {
              return { ...set, decorations: build(newState, set.threads, set.active) };
            }
            if (!tr.docChanged) return value;
            if (isRemote(tr)) {
              return { ...value, decorations: build(newState, value.threads, value.active) };
            }
            return { ...value, decorations: value.decorations.map(tr.mapping, tr.doc) };
          },
        },
        props: {
          decorations: (state) => commentHighlightsKey.getState(state)?.decorations,
          handleClick: (view, pos, event) => {
            const target = (event.target as HTMLElement | null)?.closest?.("[data-thread-id]");
            const id = target?.getAttribute("data-thread-id");
            if (id) options.onClickThread?.(id);
            return false;
          },
        },
      }),
    ];
  },
});
