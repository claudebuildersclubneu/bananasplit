import type { TxClient } from "@/server/db/context";
import { withholdComplement } from "@/server/reports/queries/ballots";

import {
  definitionLabels,
  optionsOf,
  readDefinition,
  type BallotDefinitionShape,
  type QuestionType,
} from "./ballot-definitions";
import type { Tier } from "./types";

/**
 * Aggregate ballot results (the per-question pivot every member sees):
 * question x option counts, plus first-choice counts and a Borda score for
 * ranked questions, from app.ballot_tally with the viewer's tier passed as
 * an explicit argument. For tiers without row access the function
 * suppresses every cell below OrgSettings.ballotMinCellSize (shown '<k'),
 * returns nothing to members while ballotResultsVisibleToMembers is off, and
 * never tallies free text. No ballot row is read here.
 *
 * For those tiers this module also hides what would give a small count
 * away, the way Reports does (src/server/reports/queries/ballots.ts), before
 * anything reaches the page or the CSV export:
 *   - an option nobody chose is '<k' too, not 0 (0 is below k);
 *   - a lone '<k' in a question takes the next smallest option with it
 *     (withholdComplement), or the question's total less the visible counts
 *     would be its count ("12 answered, Yes 11, No <3" means one No);
 *   - hidden options carry no share and sort last in definition order, so
 *     neither a bar nor the row order ranks them;
 *   - answers outside the definition that fewer than k gave fold into one
 *     "Other answers" row, since the answer itself could identify them.
 */

export interface PollOption {
  id: string;
  slug: string;
  title: string;
  isTest: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  linkedEventId: string | null;
}

export interface ResultCell {
  key: string;
  label: string;
  votes: number | null;
  firstChoice: number | null;
  borda: number | null;
  suppressed: boolean;
  /** Hidden although not below k, so a lone hidden count can't be worked out. */
  withheld?: boolean;
  /** Share of the question's ballots, 0..1 (null when suppressed). */
  share: number | null;
}

export interface QuestionResult {
  key: string;
  label: string;
  type: QuestionType | null;
  ballots: number;
  options: ResultCell[];
}

export interface PollResults {
  poll: PollOption;
  /** Ballots that answered at least one question (the turnout). */
  turnout: number;
  questions: QuestionResult[];
  minCellSize: number;
  /** Results are hidden from members by Settings > Privacy. */
  hidden: boolean;
}

/** The row key of the folded small answers outside the definition. */
export const OTHER_ANSWERS = "__other__";

export async function listPolls(db: TxClient, organizationId: string): Promise<PollOption[]> {
  return db.ballotDefinition.findMany({
    where: { organizationId },
    orderBy: [{ opensAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      isTest: true,
      opensAt: true,
      closesAt: true,
      linkedEventId: true,
    },
  });
}

export interface TallyRow {
  question_key: string;
  choice_key: string;
  votes: number | null;
  first_choice: number | null;
  borda: number | null;
  ballots: number;
  suppressed: boolean;
}

export async function loadPollResults(
  db: TxClient,
  organizationId: string,
  poll: PollOption,
  tier: Tier,
): Promise<PollResults> {
  const [settings, def, tally, rowAccess] = [
    await db.orgSettings.findUnique({
      where: { organizationId },
      select: { ballotMinCellSize: true, ballotResultsVisibleToMembers: true },
    }),
    await db.ballotDefinition.findFirst({
      where: { id: poll.id, organizationId },
      select: { definition: true },
    }),
    await db.$queryRaw<TallyRow[]>`
      SELECT question_key, choice_key, votes, first_choice, borda, ballots, suppressed
        FROM app.ballot_tally(${organizationId}, ${poll.id}, ${tier})`,
    // The Privacy rule views.ts's canViewBallotRows asks, inlined so this
    // module stays free of the view machinery.
    await db.$queryRaw<{ ok: boolean }[]>`
      SELECT app.can_view_ballot_rows(${organizationId}, ${tier}) AS ok`,
  ];
  const minCellSize = settings?.ballotMinCellSize ?? 3;
  const hidden = tier === "MEMBER" && settings?.ballotResultsVisibleToMembers === false;
  if (hidden) return { poll, turnout: 0, questions: [], minCellSize, hidden };

  // Exact counts only for a tier Privacy lets read the ballots themselves
  // (a suppressed cell in the tally settles it either way).
  const fullCounts = rowAccess[0]?.ok === true && !tally.some((r) => r.suppressed);
  const questions = buildPollQuestions(readDefinition(def?.definition), tally, fullCounts);
  return {
    poll,
    turnout: questions.reduce((m, q) => Math.max(m, q.ballots), 0),
    questions,
    minCellSize,
    hidden,
  };
}

/**
 * Joins app.ballot_tally's rows onto the definition (labels, definition
 * order), one result per non-text question. `fullCounts` is false for a
 * tier that sees '<k' cells; the module comment says what that hides.
 */
export function buildPollQuestions(
  definition: BallotDefinitionShape,
  tally: readonly TallyRow[],
  fullCounts: boolean,
): QuestionResult[] {
  const labels = definitionLabels(definition);
  const byQuestion = new Map<string, TallyRow[]>();
  for (const row of tally) {
    const list = byQuestion.get(row.question_key) ?? [];
    list.push(row);
    byQuestion.set(row.question_key, list);
  }

  const order = definition.questions.map((q) => q.key);
  for (const key of byQuestion.keys()) if (!order.includes(key)) order.push(key);

  const questions: QuestionResult[] = [];
  for (const key of order) {
    const q = definition.questions.find((x) => x.key === key);
    if (q?.type === "text") continue;
    const rows = byQuestion.get(key) ?? [];
    const ballots = rows[0] ? Number(rows[0].ballots) : 0;
    const ranked =
      q?.type === "slots" || rows.some((r) => r.first_choice !== null || r.borda !== null);
    const defined = q ? optionsOf(q) : [];
    const position = new Map(defined.map((o, i) => [o.key, i]));
    const seen = new Set<string>();
    let foldedOther = false;
    const cells: ResultCell[] = [];
    for (const r of rows) {
      seen.add(r.choice_key);
      if (r.suppressed && !fullCounts && !position.has(r.choice_key)) {
        foldedOther = true;
        continue;
      }
      const votes = r.votes === null ? null : Number(r.votes);
      cells.push({
        key: r.choice_key,
        label: labels.choice(key, r.choice_key),
        votes,
        firstChoice: r.first_choice === null ? null : Number(r.first_choice),
        borda: r.borda === null ? null : Number(r.borda),
        suppressed: r.suppressed,
        share: votes !== null && ballots > 0 ? votes / ballots : null,
      });
    }
    // Options nobody picked still get a row: 0 votes, which a tier that
    // sees '<k' cells sees as '<k' (0 is below k too).
    for (const o of defined) {
      if (seen.has(o.key)) continue;
      const slots = q?.type === "slots";
      cells.push(
        fullCounts
          ? {
              key: o.key,
              label: o.label,
              votes: 0,
              firstChoice: slots ? 0 : null,
              borda: slots ? 0 : null,
              suppressed: false,
              share: 0,
            }
          : {
              key: o.key,
              label: o.label,
              votes: null,
              firstChoice: null,
              borda: null,
              suppressed: true,
              share: null,
            },
      );
    }
    if (foldedOther) {
      cells.push({
        key: OTHER_ANSWERS,
        label: "Other answers",
        votes: null,
        firstChoice: null,
        borda: null,
        suppressed: true,
        share: null,
      });
    }
    if (!fullCounts) {
      withholdComplement(cells, ranked);
      for (const c of cells) if (c.suppressed) c.share = null;
    }
    // Shown options by votes (ranked: Borda score), hidden ones last; ties
    // and hidden options in definition order, so the order ranks nothing
    // hidden. Answers outside the definition come after its options.
    const at = (c: ResultCell) =>
      position.get(c.key) ?? defined.length + (c.key === OTHER_ANSWERS ? 1 : 0);
    const measure = (c: ResultCell) => (ranked ? c.borda : c.votes) ?? 0;
    cells.sort((a, b) => {
      if (a.suppressed !== b.suppressed) return a.suppressed ? 1 : -1;
      if (!a.suppressed && measure(a) !== measure(b)) return measure(b) - measure(a);
      return at(a) - at(b) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
    });
    questions.push({
      key,
      label: labels.question(key),
      type: q?.type ?? null,
      ballots,
      options: cells,
    });
  }
  return questions;
}
