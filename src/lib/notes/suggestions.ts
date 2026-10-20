import { Mark, mergeAttributes } from "@tiptap/core";
import { Fragment, type MarkType, type Node as PMNode, Slice } from "@tiptap/pm/model";
import {
  type EditorState,
  Plugin,
  PluginKey,
  TextSelection,
  type Transaction,
} from "@tiptap/pm/state";
import { ReplaceStep } from "@tiptap/pm/transform";

/**
 * Suggesting mode (decision 20.12a, built in-house): in a note, an editor
 * can switch from Editing to Suggesting, and what they type or delete shows
 * as a suggestion others accept or reject, as in Google Docs.
 *
 * Two marks carry it, so a suggestion lives in the document itself (it
 * saves, merges live through Yjs and survives a reload like any text):
 *
 *   suggestionInsert  text someone proposes to add (shown underlined)
 *   suggestionDelete  text someone proposes to remove (shown struck through;
 *                     it stays in the document until the deletion is accepted)
 *
 * Both have the suggestion's `id`, who made it (`authorId`, `authorName`)
 * and when (`at`, ms). Adjacent edits by the same person join one
 * suggestion.
 *
 * The plugin below turns an editor's ordinary edits into suggestions after
 * the fact (appendTransaction): text that was typed gets the insert mark,
 * and text that was deleted is put back with the delete mark. Deleting your
 * own pending insertion simply removes it.
 *
 * Limits (the basic version): insertions and deletions of text and inline
 * chips are tracked. Formatting changes, list and quote changes (wrapping
 * and lifting) and new paragraphs apply directly; deleting a whole block
 * that holds no text (an image, a divider) is refused while suggesting.
 */

export const SUGGESTION_INSERT = "suggestionInsert";
export const SUGGESTION_DELETE = "suggestionDelete";

export interface SuggestionAuthor {
  id: string;
  name: string;
}

const suggestionAttributes = {
  id: { default: null },
  authorId: { default: null },
  authorName: { default: null },
  at: { default: null },
};

function parseSuggestionAttrs(el: HTMLElement) {
  return {
    id: el.getAttribute("data-suggestion-id"),
    authorId: el.getAttribute("data-author-id"),
    authorName: el.getAttribute("data-author-name"),
    at: Number(el.getAttribute("data-at")) || null,
  };
}

function suggestionHtml(attrs: Record<string, unknown>) {
  return {
    "data-suggestion-id": attrs.id,
    "data-author-id": attrs.authorId,
    "data-author-name": attrs.authorName,
    "data-at": attrs.at,
  };
}

export const SuggestionInsertMark = Mark.create({
  name: SUGGESTION_INSERT,
  inclusive: false,
  excludes: SUGGESTION_DELETE,
  addAttributes: () => suggestionAttributes,
  parseHTML: () => [
    { tag: "ins[data-suggestion-id]", getAttrs: (el) => parseSuggestionAttrs(el as HTMLElement) },
  ],
  renderHTML: ({ HTMLAttributes, mark }) => [
    "ins",
    mergeAttributes(suggestionHtml(mark.attrs), { class: "note-suggest-insert" }, HTMLAttributes),
    0,
  ],
});

export const SuggestionDeleteMark = Mark.create({
  name: SUGGESTION_DELETE,
  inclusive: false,
  excludes: SUGGESTION_INSERT,
  addAttributes: () => suggestionAttributes,
  parseHTML: () => [
    { tag: "del[data-suggestion-id]", getAttrs: (el) => parseSuggestionAttrs(el as HTMLElement) },
  ],
  renderHTML: ({ HTMLAttributes, mark }) => [
    "del",
    mergeAttributes(suggestionHtml(mark.attrs), { class: "note-suggest-delete" }, HTMLAttributes),
    0,
  ],
});

// ---- The plugin ---------------------------------------------------------------

export interface SuggestingState {
  enabled: boolean;
  author: SuggestionAuthor | null;
}

export const suggestingKey = new PluginKey<SuggestingState>("noteSuggesting");

/** Meta on a transaction the plugin must leave alone (accepting, rejecting, restoring). */
export const SKIP_SUGGESTING = "noteSuggestingSkip";

/** y-prosemirror marks transactions that mirror remote (or undone) Yjs changes with this meta key. */
const Y_SYNC_META = "y-sync$";
const HISTORY_META = "history$";

let counter = 0;
function newSuggestionId(): string {
  counter = (counter + 1) % 1_000_000;
  return `s${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function hasInline(fragment: Fragment): boolean {
  let found = false;
  fragment.descendants((node) => {
    if (found) return false;
    if (node.isInline) found = true;
    return !found;
  });
  return found;
}

/**
 * The deleted content as it is put back: every inline node gets the delete
 * mark (keeping an earlier deletion's), and the author's own pending
 * insertions are dropped (deleting your own suggestion takes it away).
 */
function markDeleted(
  fragment: Fragment,
  types: { insert: MarkType; delete: MarkType },
  author: SuggestionAuthor,
  id: string,
  at: number,
): Fragment {
  const nodes: PMNode[] = [];
  fragment.forEach((node) => {
    if (node.isInline) {
      const ownInsert = node.marks.find(
        (m) => m.type === types.insert && m.attrs.authorId === author.id,
      );
      if (ownInsert) return;
      if (node.marks.some((m) => m.type === types.delete)) {
        nodes.push(node);
        return;
      }
      const marks = types.delete
        .create({ id, authorId: author.id, authorName: author.name, at })
        .addToSet(node.marks.filter((m) => m.type !== types.insert));
      nodes.push(node.mark(marks));
      return;
    }
    nodes.push(node.copy(markDeleted(node.content, types, author, id, at)));
  });
  return Fragment.from(nodes);
}

/** The id of a suggestion mark of `type` by `author` right next to `pos`, to join it. */
function adjacentId(doc: PMNode, pos: number, type: MarkType, author: SuggestionAuthor) {
  const $pos = doc.resolve(Math.max(0, Math.min(pos, doc.content.size)));
  for (const node of [$pos.nodeBefore, $pos.nodeAfter]) {
    const mark = node?.marks.find((m) => m.type === type && m.attrs.authorId === author.id);
    if (mark?.attrs.id) return String(mark.attrs.id);
  }
  return null;
}

/**
 * Turns the edits of `transactions` into suggestions, or returns null when
 * there is nothing to do. Exported for the tests; the plugin calls it.
 */
export function trackSuggestions(
  transactions: readonly Transaction[],
  oldState: EditorState,
  newState: EditorState,
  author: SuggestionAuthor,
  now: number = Date.now(),
): Transaction | null {
  const insertType = newState.schema.marks[SUGGESTION_INSERT];
  const deleteType = newState.schema.marks[SUGGESTION_DELETE];
  if (!insertType || !deleteType) return null;
  const relevant = transactions.filter(
    (t) =>
      t.docChanged &&
      !t.getMeta(SKIP_SUGGESTING) &&
      !t.getMeta(Y_SYNC_META) &&
      !t.getMeta(HISTORY_META),
  );
  // One edit at a time: what typing, deleting, pasting and dragging produce.
  if (relevant.length !== 1 || transactions.length !== 1) return null;
  const t = relevant[0]!;

  const tr = newState.tr;
  // ProseMirror tags it "appendedTransaction", so one undo takes back both.
  tr.setMeta(SKIP_SUGGESTING, true);
  let changed = false;
  let selectionAt: number | null = null;

  t.steps.forEach((step, i) => {
    if (!(step instanceof ReplaceStep)) return;
    // ReplaceStep's from, to and slice are public in prosemirror-transform.
    const { from, to, slice } = step as unknown as { from: number; to: number; slice: Slice };
    const before = t.docs[i]!;
    const after = t.mapping.slice(i + 1);
    after.appendMapping(tr.mapping);
    const start = after.map(from, -1);
    const insertedSize = slice.size;
    const end = after.map(from + insertedSize, 1);

    // 1. Typed (or pasted) text: an insertion suggestion.
    if (insertedSize > 0 && hasInline(slice.content)) {
      const id = adjacentId(tr.doc, start, insertType, author) ?? newSuggestionId();
      tr.removeMark(start, end, deleteType);
      tr.removeMark(start, end, insertType);
      tr.addMark(
        start,
        end,
        insertType.create({ id, authorId: author.id, authorName: author.name, at: now }),
      );
      changed = true;
    }

    // 2. Deleted text: put back before the insertion, struck through.
    if (to > from) {
      const deleted = before.slice(from, to);
      if (!hasInline(deleted.content)) {
        // A paragraph boundary (joining two paragraphs): applies directly.
        // A whole block without text (an image, a rule): refused.
        let blockGone = false;
        deleted.content.descendants((node) => {
          if (node.isAtom && node.isBlock) blockGone = true;
          return !blockGone;
        });
        if (blockGone) {
          tr.replace(start, start, deleted);
          changed = true;
        }
        return;
      }
      const id = adjacentId(tr.doc, start, deleteType, author) ?? newSuggestionId();
      const restored = new Slice(
        markDeleted(deleted.content, { insert: insertType, delete: deleteType }, author, id, now),
        deleted.openStart,
        deleted.openEnd,
      );
      if (restored.size === 0 || !hasInline(restored.content)) return;
      const sizeBefore = tr.doc.content.size;
      tr.replace(start, start, restored);
      const added = tr.doc.content.size - sizeBefore;
      changed = true;

      if (insertedSize === 0) {
        // Backspace leaves the caret before the struck text (so the next one
        // carries on leftwards); Delete, after it.
        const old = oldState.selection;
        const forward = old.empty && old.from === from;
        selectionAt = forward ? start + added : start;
      }
    }
  });

  if (!changed) return null;
  if (selectionAt !== null) {
    tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(selectionAt, tr.doc.content.size))));
  }
  return tr;
}

/** Suggesting mode for an editor: off until a SuggestingState meta turns it on. */
export function suggestingPlugin(): Plugin<SuggestingState> {
  return new Plugin<SuggestingState>({
    key: suggestingKey,
    state: {
      init: () => ({ enabled: false, author: null }),
      apply(tr, value) {
        const meta = tr.getMeta(suggestingKey) as Partial<SuggestingState> | undefined;
        return meta ? { ...value, ...meta } : value;
      },
    },
    appendTransaction(transactions, oldState, newState) {
      const state = suggestingKey.getState(newState);
      if (!state?.enabled || !state.author) return null;
      return trackSuggestions(transactions, oldState, newState, state.author);
    },
  });
}

// ---- Reading, accepting and rejecting -------------------------------------------

export interface NoteSuggestion {
  id: string;
  kind: "insert" | "delete";
  text: string;
  authorId: string | null;
  authorName: string | null;
  at: number | null;
  /** Where its first piece starts (for scrolling to it). */
  from: number;
}

/** Every suggestion in the document, in document order. */
export function listSuggestions(doc: PMNode): NoteSuggestion[] {
  const byKey = new Map<string, NoteSuggestion>();
  doc.descendants((node, pos) => {
    if (!node.isInline) return true;
    for (const mark of node.marks) {
      const kind =
        mark.type.name === SUGGESTION_INSERT
          ? "insert"
          : mark.type.name === SUGGESTION_DELETE
            ? "delete"
            : null;
      if (!kind || !mark.attrs.id) continue;
      const key = `${kind}:${mark.attrs.id}`;
      const piece = node.isText ? (node.text ?? "") : node.textContent || "▪";
      const existing = byKey.get(key);
      if (existing) existing.text += piece;
      else
        byKey.set(key, {
          id: String(mark.attrs.id),
          kind,
          text: piece,
          authorId: mark.attrs.authorId ?? null,
          authorName: mark.attrs.authorName ?? null,
          at: typeof mark.attrs.at === "number" ? mark.attrs.at : null,
          from: pos,
        });
    }
    return false;
  });
  return [...byKey.values()].sort((a, b) => a.from - b.from);
}

/** The ranges carrying suggestion `id` (insertions and deletions), last first. */
function rangesOf(doc: PMNode, id: string | null) {
  const ranges: { from: number; to: number; kind: "insert" | "delete" }[] = [];
  doc.descendants((node, pos) => {
    if (!node.isInline) return true;
    for (const mark of node.marks) {
      if (id !== null && mark.attrs.id !== id) continue;
      if (mark.type.name === SUGGESTION_INSERT)
        ranges.push({ from: pos, to: pos + node.nodeSize, kind: "insert" });
      if (mark.type.name === SUGGESTION_DELETE)
        ranges.push({ from: pos, to: pos + node.nodeSize, kind: "delete" });
    }
    return false;
  });
  return ranges.sort((a, b) => b.from - a.from);
}

/**
 * Accepts (keeps the insertion, carries out the deletion) or rejects (drops
 * the insertion, keeps the text) suggestion `id`, or every suggestion when
 * `id` is null. Null when there is nothing to change.
 */
export function resolveSuggestion(
  state: EditorState,
  id: string | null,
  decision: "accept" | "reject",
): Transaction | null {
  const insertType = state.schema.marks[SUGGESTION_INSERT];
  const deleteType = state.schema.marks[SUGGESTION_DELETE];
  if (!insertType || !deleteType) return null;
  const ranges = rangesOf(state.doc, id);
  if (ranges.length === 0) return null;
  const tr = state.tr.setMeta(SKIP_SUGGESTING, true);
  for (const range of ranges) {
    const remove =
      (range.kind === "insert" && decision === "reject") ||
      (range.kind === "delete" && decision === "accept");
    if (remove) tr.delete(range.from, range.to);
    else tr.removeMark(range.from, range.to, range.kind === "insert" ? insertType : deleteType);
  }
  return tr;
}
