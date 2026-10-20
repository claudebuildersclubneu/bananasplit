import type { Node as PMNode } from "@tiptap/pm/model";

/**
 * Where a comment thread sits in a note, and finding it again after edits.
 *
 * A thread keeps the passage it was made on (`anchorText`) and an anchor:
 * its positions when it was made, a little text either side, and, in a
 * live note, Yjs relative positions (which follow the passage through any
 * edit, the user's or anyone else's; the editor resolves those). Without
 * those, or when they no longer resolve, the passage is found by its text:
 * the occurrence whose surroundings match best, nearest where it was.
 * A passage that was deleted entirely is "detached": the thread keeps its
 * quote and stays in the list.
 */

export interface TextAnchor {
  from: number;
  to: number;
  prefix?: string;
  suffix?: string;
  /** Yjs relative positions (Y.relativePositionToJSON), in a live note. */
  yjs?: { from: unknown; to: unknown };
}

export interface Range {
  from: number;
  to: number;
}

/** A leaf node that is not text reads as this one character. */
const ATOM = "￼";
const CONTEXT = 32;

/** The document as one string, with each character's position (null at block breaks). */
function flatten(doc: PMNode): { text: string; positions: (number | null)[] } {
  let text = "";
  const positions: (number | null)[] = [];
  let lastBlockEnd = -1;
  doc.descendants((node, pos) => {
    if (node.isBlock && node.isTextblock) {
      if (lastBlockEnd >= 0) {
        text += "\n";
        positions.push(null);
      }
      lastBlockEnd = pos + node.nodeSize;
      return true;
    }
    if (node.isText) {
      const value = node.text ?? "";
      for (let i = 0; i < value.length; i++) {
        text += value[i];
        positions.push(pos + i);
      }
      return false;
    }
    if (node.isInline && node.isLeaf) {
      text += ATOM;
      positions.push(pos);
      return false;
    }
    return true;
  });
  return { text, positions };
}

/** The passage between two positions, as anchorText reads it. */
export function passageText(doc: PMNode, from: number, to: number): string {
  return doc.textBetween(from, to, "\n", ATOM);
}

/** The anchor for a passage selected in `doc`. */
export function anchorFor(doc: PMNode, from: number, to: number): TextAnchor {
  const start = Math.max(0, from);
  const end = Math.min(doc.content.size, to);
  return {
    from: start,
    to: end,
    prefix: doc.textBetween(Math.max(0, start - CONTEXT), start, "\n", ATOM).slice(-CONTEXT),
    suffix: doc
      .textBetween(end, Math.min(doc.content.size, end + CONTEXT), "\n", ATOM)
      .slice(0, CONTEXT),
  };
}

/** How many characters `a` ends with that `b` ends with (or starts with, `fromStart`). */
function overlap(a: string, b: string, fromStart: boolean): number {
  let n = 0;
  const max = Math.min(a.length, b.length);
  while (n < max) {
    const ca = fromStart ? a[n] : a[a.length - 1 - n];
    const cb = fromStart ? b[n] : b[b.length - 1 - n];
    if (ca !== cb) break;
    n++;
  }
  return n;
}

/**
 * The passage `anchorText` in `doc`: the occurrence with the best matching
 * surroundings, then the nearest to where it was. Null when it is gone.
 */
export function findPassage(
  doc: PMNode,
  anchorText: string,
  anchor: Partial<TextAnchor> | null,
): Range | null {
  if (!anchorText) return null;
  const { text, positions } = flatten(doc);
  let best: { range: Range; score: number; distance: number } | null = null;
  for (let at = text.indexOf(anchorText); at !== -1; at = text.indexOf(anchorText, at + 1)) {
    const first = positions[at];
    const last = positions[at + anchorText.length - 1];
    if (first == null || last == null) continue;
    const before = text.slice(Math.max(0, at - CONTEXT), at);
    const after = text.slice(at + anchorText.length, at + anchorText.length + CONTEXT);
    const score =
      overlap(before, anchor?.prefix ?? "", false) + overlap(after, anchor?.suffix ?? "", true);
    const distance = Math.abs(first - (anchor?.from ?? first));
    if (!best || score > best.score || (score === best.score && distance < best.distance)) {
      best = { range: { from: first, to: last + 1 }, score, distance };
    }
  }
  return best?.range ?? null;
}

/** Whether `range` still holds `anchorText` (a Yjs-resolved range is trusted only then). */
export function rangeHolds(doc: PMNode, range: Range, anchorText: string): boolean {
  if (range.from >= range.to || range.to > doc.content.size) return false;
  return passageText(doc, range.from, range.to) === anchorText;
}

export function isTextAnchor(value: unknown): value is TextAnchor {
  if (!value || typeof value !== "object") return false;
  const a = value as Record<string, unknown>;
  return typeof a.from === "number" && typeof a.to === "number";
}
