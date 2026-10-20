/**
 * Comparing two versions of a note (the history panel's Compare): a word
 * diff of their plain text. Longest common subsequence over words, which is
 * plenty for a note; past MAX_CELLS (very long notes) it compares whole
 * lines instead so it stays fast.
 */

export interface DiffPart {
  kind: "same" | "added" | "removed";
  text: string;
}

const MAX_CELLS = 4_000_000;

function tokens(text: string, byLine: boolean): string[] {
  return byLine ? text.split(/(?<=\n)/) : (text.match(/\s+|[^\s]+/g) ?? []);
}

export function diffText(before: string, after: string): DiffPart[] {
  let a = tokens(before, false);
  let b = tokens(after, false);
  if (a.length * b.length > MAX_CELLS) {
    a = tokens(before, true);
    b = tokens(after, true);
  }
  // Common prefix and suffix first: most edits touch a small part.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);

  const parts: DiffPart[] = [];
  const push = (kind: DiffPart["kind"], text: string) => {
    if (!text) return;
    const last = parts[parts.length - 1];
    if (last && last.kind === kind) last.text += text;
    else parts.push({ kind, text });
  };
  push("same", a.slice(0, start).join(""));

  if (midA.length * midB.length > MAX_CELLS) {
    push("removed", midA.join(""));
    push("added", midB.join(""));
  } else {
    const n = midA.length;
    const m = midB.length;
    // lcs[i][j]: the LCS length of midA[i..] and midB[j..], one flat array.
    const lcs = new Uint32Array((n + 1) * (m + 1));
    const at = (i: number, j: number) => i * (m + 1) + j;
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lcs[at(i, j)] =
          midA[i] === midB[j]
            ? lcs[at(i + 1, j + 1)]! + 1
            : Math.max(lcs[at(i + 1, j)]!, lcs[at(i, j + 1)]!);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (midA[i] === midB[j]) {
        push("same", midA[i]!);
        i++;
        j++;
      } else if (lcs[at(i + 1, j)]! >= lcs[at(i, j + 1)]!) {
        push("removed", midA[i]!);
        i++;
      } else {
        push("added", midB[j]!);
        j++;
      }
    }
    while (i < n) push("removed", midA[i++]!);
    while (j < m) push("added", midB[j++]!);
  }

  push("same", a.slice(endA).join(""));
  return parts;
}

/** How many words were added and removed. */
export function diffStats(parts: DiffPart[]): { added: number; removed: number } {
  const words = (t: string) => (t.match(/[^\s]+/g) ?? []).length;
  return {
    added: parts.filter((p) => p.kind === "added").reduce((n, p) => n + words(p.text), 0),
    removed: parts.filter((p) => p.kind === "removed").reduce((n, p) => n + words(p.text), 0),
  };
}
