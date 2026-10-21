import {
  buildPollGrid,
  pickDistinctWindows,
  rankSlotsByAvailability,
  type PollResponseLite,
  type PollSlotLite,
  type RankedSlot,
} from "@/components/calendar/poll-grid-utils";

/**
 * A find-a-time poll's results at a glance, for its card and the top of its
 * page: who answered, the best times that don't overlap, and a small heat
 * map (days across, times down, how many are free in each cell) to draw as
 * the poll's picture. Pure; the grid is in `timeZone`.
 */

export interface PollHeat {
  days: number;
  times: number;
  /** 0..1 per cell, row by row (time), column by column (day); null where nothing was offered. */
  cells: (number | null)[];
  /** Cells inside the best time, outlined on the picture. */
  best: boolean[];
}

export interface PollSummary {
  respondents: number;
  best: RankedSlot[];
  heat: PollHeat;
}

/** Rows the picture is squeezed into: an evening of 15-minute slots is still a few bands. */
const MAX_ROWS = 16;

export function summarizePoll(
  slots: PollSlotLite[],
  responses: PollResponseLite[],
  durationMinutes: number,
  timeZone: string,
  bestCount = 3,
): PollSummary {
  const answered = responses.filter((r) => r.availability !== "NO");
  const respondents = new Set(answered.map((r) => r.respondentKey)).size;
  const best = pickDistinctWindows(
    rankSlotsByAvailability(slots, answered, durationMinutes),
    bestCount,
  );

  const grid = buildPollGrid(slots, timeZone);
  const freeBySlot = new Map<string, Set<string>>();
  for (const r of answered) {
    const set = freeBySlot.get(r.slotId) ?? new Set<string>();
    set.add(r.respondentKey);
    freeBySlot.set(r.slotId, set);
  }
  const bestIds = new Set(best[0]?.slotIds ?? []);
  const step = Math.max(1, Math.ceil(grid.times.length / MAX_ROWS));
  const rows = Math.ceil(grid.times.length / step);
  const cells: (number | null)[] = [];
  const bestCells: boolean[] = [];
  for (let row = 0; row < rows; row++) {
    const band = grid.times.slice(row * step, row * step + step);
    for (const day of grid.days) {
      let offered = false;
      let free = 0;
      let inBest = false;
      for (const time of band) {
        const slot = grid.cellFor(day, time);
        if (!slot) continue;
        offered = true;
        free = Math.max(free, freeBySlot.get(slot.id)?.size ?? 0);
        if (bestIds.has(slot.id)) inBest = true;
      }
      cells.push(offered ? (respondents === 0 ? 0 : free / respondents) : null);
      bestCells.push(inBest);
    }
  }
  return {
    respondents,
    best,
    heat: { days: grid.days.length, times: rows, cells, best: bestCells },
  };
}

/**
 * Answers as the grid utilities take them, from database rows: members by
 * user id, guests by their key (or, for rows from before guest keys, their
 * name). Server-side only in spirit: the keys never leave the summary.
 */
export function responsesLite(
  rows: {
    slotId: string;
    userId: string | null;
    guestName: string | null;
    guestKeyHash: string | null;
    availability: PollResponseLite["availability"];
  }[],
): PollResponseLite[] {
  return rows.map((r) => ({
    slotId: r.slotId,
    respondentKey: r.userId ?? (r.guestKeyHash ? `g:${r.guestKeyHash}` : `n:${r.guestName ?? ""}`),
    availability: r.availability,
  }));
}
