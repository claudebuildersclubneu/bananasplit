import { describe, expect, it, vi } from "vitest";

import type { BallotDefinitionShape } from "./ballot-definitions";
import {
  buildPollQuestions,
  loadPollResults,
  OTHER_ANSWERS,
  type PollOption,
  type TallyRow,
} from "./ballot-results";

/**
 * Databases' ballot results hide small counts the way Reports does, on the
 * server: a viewer without row access can't subtract a '<k' option out of
 * the question's total, and an option nobody chose is '<k', not 0.
 */

const def: BallotDefinitionShape = {
  questions: [
    { key: "attend", label: "Attending?", type: "yesno", options: [] },
    {
      key: "topic",
      label: "Topic",
      type: "single",
      options: [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
        { key: "c", label: "C" },
      ],
    },
    {
      key: "slot",
      label: "Slot",
      type: "slots",
      options: [
        { key: "mon", label: "Mon" },
        { key: "tue", label: "Tue" },
        { key: "wed", label: "Wed" },
      ],
    },
    { key: "notes", label: "Notes", type: "text", options: [] },
  ],
};

const cell = (
  question_key: string,
  choice_key: string,
  ballots: number,
  votes: number | null,
  ranked?: { first: number | null; borda: number | null },
): TallyRow => ({
  question_key,
  choice_key,
  votes,
  first_choice: ranked ? ranked.first : null,
  borda: ranked ? ranked.borda : null,
  ballots,
  suppressed: votes === null,
});

const view = (questions: ReturnType<typeof buildPollQuestions>, key: string) =>
  questions
    .find((q) => q.key === key)!
    .options.map((o) => [o.key, o.withheld ? "hidden" : o.suppressed ? "<k" : o.votes, o.share]);

describe("buildPollQuestions", () => {
  it("withholds the next smallest option when one alone is below k (12 answered, Yes 11, No <3)", () => {
    const tally = [cell("attend", "yes", 12, 11), cell("attend", "no", 12, null)];
    const restricted = buildPollQuestions(def, tally, false);
    // Neither count, nor a share, nor the order gives the one No away.
    expect(view(restricted, "attend")).toEqual([
      ["yes", "hidden", null],
      ["no", "<k", null],
    ]);
    const yes = restricted[0].options[0];
    expect(yes).toMatchObject({ votes: null, firstChoice: null, borda: null, suppressed: true });
  });

  it("shows an option nobody chose as <k to a restricted viewer, and as 0 with full counts", () => {
    const tally = [cell("topic", "a", 9, 5), cell("topic", "b", 9, 4)];
    // Restricted: C (0 votes) is below k, so B goes with it.
    expect(view(buildPollQuestions(def, tally, false), "topic")).toEqual([
      ["a", 5, 5 / 9],
      ["b", "hidden", null],
      ["c", "<k", null],
    ]);
    expect(view(buildPollQuestions(def, tally, true), "topic")).toEqual([
      ["a", 5, 5 / 9],
      ["b", 4, 4 / 9],
      ["c", 0, 0],
    ]);
  });

  it("withholds nothing more when two options are already below k", () => {
    const tally = [
      cell("topic", "c", 10, null),
      cell("topic", "a", 10, 8),
      cell("topic", "b", 10, null),
    ];
    // Hidden options keep definition order (b before c), whatever their counts.
    expect(view(buildPollQuestions(def, tally, false), "topic")).toEqual([
      ["a", 8, 0.8],
      ["b", "<k", null],
      ["c", "<k", null],
    ]);
  });

  it("measures a ranked question by Borda score, and hides first choices with it", () => {
    const tally = [
      cell("slot", "mon", 6, 6, { first: 4, borda: 15 }),
      cell("slot", "tue", 6, 5, { first: 2, borda: 9 }),
      cell("slot", "wed", 6, null, { first: null, borda: null }),
    ];
    const [q] = buildPollQuestions(def, tally, false).filter((x) => x.key === "slot");
    expect(q.options.map((o) => [o.key, o.borda, o.firstChoice, o.withheld ?? false])).toEqual([
      ["mon", 15, 4, false],
      ["tue", null, null, true],
      ["wed", null, null, false],
    ]);
  });

  it("folds small answers outside the definition into one row for a restricted viewer", () => {
    const tally = [
      cell("topic", "a", 9, 4),
      cell("topic", "b", 9, 3),
      cell("topic", "c", 9, 3),
      cell("topic", "retired-option", 9, null),
    ];
    // The fold is the lone small row, so the smallest shown option (b, first
    // of the tie in definition order) is withheld with it.
    expect(view(buildPollQuestions(def, tally, false), "topic")).toEqual([
      ["a", 4, 4 / 9],
      ["c", 3, 3 / 9],
      ["b", "hidden", null],
      [OTHER_ANSWERS, "<k", null],
    ]);
  });

  it("never pivots a free-text question", () => {
    expect(buildPollQuestions(def, [], true).map((q) => q.key)).toEqual([
      "attend",
      "topic",
      "slot",
    ]);
  });
});

describe("loadPollResults", () => {
  const poll: PollOption = {
    id: "bd_1",
    slug: "fall",
    title: "Fall",
    isTest: false,
    opensAt: null,
    closesAt: null,
    linkedEventId: null,
  };

  function fakeDb(opts: { rowAccess: boolean; visibleToMembers?: boolean; tally: TallyRow[] }) {
    return {
      orgSettings: {
        findUnique: vi.fn(async () => ({
          ballotMinCellSize: 3,
          ballotResultsVisibleToMembers: opts.visibleToMembers ?? true,
        })),
      },
      ballotDefinition: { findFirst: vi.fn(async () => ({ definition: def })) },
      $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
        const sql = strings.join("?");
        if (sql.includes("app.ballot_tally")) return opts.tally;
        if (sql.includes("app.can_view_ballot_rows")) return [{ ok: opts.rowAccess }];
        throw new Error(`unexpected query: ${sql}`);
      }),
    } as unknown as Parameters<typeof loadPollResults>[0];
  }

  it("treats a tier without row access as restricted before anything leaves the server", async () => {
    // Every cell is at least k, so the tally alone suppresses nothing.
    const tally = [cell("topic", "a", 7, 4), cell("topic", "b", 7, 3)];
    const member = await loadPollResults(
      fakeDb({ rowAccess: false, tally }),
      "org_1",
      poll,
      "MEMBER",
    );
    expect(view(member.questions, "topic")).toEqual([
      ["a", 4, 4 / 7],
      ["b", "hidden", null],
      ["c", "<k", null],
    ]);
    const owner = await loadPollResults(fakeDb({ rowAccess: true, tally }), "org_1", poll, "OWNER");
    expect(view(owner.questions, "topic")).toEqual([
      ["a", 4, 4 / 7],
      ["b", 3, 3 / 7],
      ["c", 0, 0],
    ]);
  });

  it("returns no questions at all while results are hidden from members", async () => {
    const results = await loadPollResults(
      fakeDb({ rowAccess: false, visibleToMembers: false, tally: [] }),
      "org_1",
      poll,
      "MEMBER",
    );
    expect(results).toMatchObject({ hidden: true, questions: [], turnout: 0, minCellSize: 3 });
  });
});
