import type { TaskStatus } from "@/generated/prisma/enums";

import { STATUS_ORDER } from "./status";

/**
 * Board order. A task's rank is a fractional-indexing key ("a0", "a0V",
 * "Zz", ...), and those keys only sort correctly byte by byte: "Zz" is
 * generated to go BEFORE "a0". Postgres compares text by the database's
 * collation, which may fold case and put "Zz" after "a1", so anything that
 * needs the real order sorts here (or in SQL with COLLATE "C"), never with
 * a plain ORDER BY "rank".
 */
export function compareRank(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Column, then rank, then id. Two tasks can share a rank (rows written
 * before ranks were renewed on every status change, or a column renumbered
 * while one of its tasks was private to somebody else), and the id keeps
 * them in a stable order the server and the board agree on.
 */
export function compareBoardOrder(
  a: { status: TaskStatus; rank: string; id: string },
  b: { status: TaskStatus; rank: string; id: string },
): number {
  return (
    STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
    compareRank(a.rank, b.rank) ||
    compareRank(a.id, b.id)
  );
}

/**
 * A column's order with `movedId` placed where the drop asked: right after
 * `beforeId`, else right before `afterId`, else at the bottom. `ids` is the
 * column in board order without the moved task. A neighbour that is no
 * longer in the column is ignored.
 */
export function placeInColumn(
  ids: readonly string[],
  movedId: string,
  beforeId: string | null,
  afterId: string | null,
): string[] {
  const rest = ids.filter((id) => id !== movedId);
  let at = rest.length;
  const before = beforeId ? rest.indexOf(beforeId) : -1;
  const after = afterId ? rest.indexOf(afterId) : -1;
  if (before !== -1) at = before + 1;
  else if (after !== -1) at = after;
  rest.splice(at, 0, movedId);
  return rest;
}
