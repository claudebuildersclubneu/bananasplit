import { describe, expect, it } from "vitest";

import type { DraftPosition } from "./draft";
import {
  applyOutline,
  draftFromMembers,
  membersOffChart,
  outlineOrder,
  parseOutline,
  serializeOutline,
  unknownPeople,
  type OutlineLine,
} from "./outline";
import { validateChart } from "./validate";
import { toValidationNodes } from "./draft";

const MEMBERS = [
  { id: "maya", name: "Maya Patel" },
  { id: "ana", name: "Ana Kim" },
  { id: "jay", name: "Jay Lin" },
  { id: "sam", name: "Sam Rivera" },
  { id: "sam2", name: "Sam Rivera" },
  { id: "ivy", name: "Ivy Chen" },
];

const shape = (lines: OutlineLine[]) => lines.map((l) => [l.title, l.person, l.parent, l.depth]);

describe("parseOutline", () => {
  it("reads one position per line, indentation as reporting lines", () => {
    const lines = parseOutline(
      ["President — @Maya Patel", "  Treasurer — @Jay Lin", "  VP Events — @Ana Kim", "    Open: Events coordinator", "  Secretary"].join("\n"),
    );
    expect(shape(lines)).toEqual([
      ["President", "Maya Patel", null, 0],
      ["Treasurer", "Jay Lin", 0, 1],
      ["VP Events", "Ana Kim", 0, 1],
      ["Events coordinator", null, 2, 2],
      ["Secretary", null, 0, 1],
    ]);
    expect(lines[0].mention).toBe(true);
    expect(lines[3].isOpen).toBe(true);
    expect(lines.map((l) => l.line)).toEqual([0, 1, 2, 3, 4]);
  });

  it("works with any consistent indent: four spaces, tabs, mixed depth jumps", () => {
    const four = parseOutline("A\n    B\n        C\n    D");
    expect(shape(four).map((s) => s[2])).toEqual([null, 0, 1, 0]);
    const tabs = parseOutline("A\n\tB\n\t\tC\nE");
    expect(shape(tabs).map((s) => s[2])).toEqual([null, 0, 1, null]);
    // Going back up to a depth that never existed attaches to the nearest shallower line.
    const odd = parseOutline("A\n      B\n   C");
    expect(shape(odd).map((s) => s[2])).toEqual([null, 0, 0]);
  });

  it("skips blank lines and keeps their line numbers", () => {
    const lines = parseOutline("\n\nPresident\n\n   \n  VP\n");
    expect(lines.map((l) => [l.title, l.line, l.parent])).toEqual([
      ["President", 2, null],
      ["VP", 5, 0],
    ]);
    expect(parseOutline("")).toEqual([]);
    expect(parseOutline("   \n\t\n")).toEqual([]);
  });

  it.each([
    ["VP Events — @Ana Kim", "VP Events", "Ana Kim", true],
    ["VP Events – Ana Kim", "VP Events", "Ana Kim", false],
    ["VP Events - Ana Kim", "VP Events", "Ana Kim", false],
    ["VP Events -- Ana Kim", "VP Events", "Ana Kim", false],
    ["VP Events: Ana Kim", "VP Events", "Ana Kim", false],
    ["VP Events | Ana Kim", "VP Events", "Ana Kim", false],
    ["VP Events @Ana Kim", "VP Events", "Ana Kim", true],
    ["VP Events—Ana Kim", "VP Events—Ana Kim", null, false],
    ["Co-founder", "Co-founder", null, false],
    ["VP Events —", "VP Events", null, false],
    ["— @Ana Kim", "Member", "Ana Kim", true],
    ["**VP Events** — Ana Kim", "VP Events", "Ana Kim", false],
  ])("%s", (text, title, person, mention) => {
    const [line] = parseOutline(text);
    expect([line.title, line.person, line.mention]).toEqual([title, person, mention]);
  });

  it.each([
    ["Open: Designer", true, false],
    ["open:Designer", true, false],
    ["Designer — Open", true, false],
    ["Designer — TBD", true, false],
    ["Designer — vacant", true, false],
    ["Designer — [OPEN HIRE]", true, false],
    ["Designer (open)", true, false],
    ["Open: Designer — @Ana Kim", true, false],
    ["Advisor: Faculty advisor — Dr. Lee", false, true],
    ["Faculty advisor — Dr. Lee (advisor)", false, true],
    ["Advisor: Open: Alumni advisor", true, true],
  ])("markers: %s", (text, isOpen, isAdvisor) => {
    const [line] = parseOutline(text);
    expect([line.isOpen, line.isAdvisor]).toEqual([isOpen, isAdvisor]);
    if (isOpen) expect(line.person).toBeNull();
    expect(line.title).not.toMatch(/open:|advisor:|\(advisor\)|\(open\)/i);
  });

  it("reads pasted bullets, numbers, drawn trees and markdown headings", () => {
    expect(shape(parseOutline("- President — Maya\n  - VP — Ana\n    - Lead — Ivy\n- Advisor: Prof"))).toEqual([
      ["President", "Maya", null, 0],
      ["VP", "Ana", 0, 1],
      ["Lead", "Ivy", 1, 2],
      ["Prof", null, null, 0],
    ]);
    expect(shape(parseOutline("1. President\n   1. VP\n   2. Treasurer\n2. Advisor")).map((s) => s[2])).toEqual([null, 0, 0, null]);
    const tree = ["President — Maya", "├── VP Events — Ana", "│   └── Coordinator", "└── Treasurer — Jay"].join("\n");
    expect(shape(parseOutline(tree))).toEqual([
      ["President", "Maya", null, 0],
      ["VP Events", "Ana", 0, 1],
      ["Coordinator", null, 1, 2],
      ["Treasurer", "Jay", 0, 1],
    ]);
    const ascii = ["President", "|-- VP", "|   +-- Lead", "+-- Treasurer"].join("\n");
    expect(shape(parseOutline(ascii)).map((s) => s[2])).toEqual([null, 0, 1, 0]);
    expect(shape(parseOutline("# President — Maya\n## VP Ops — Oliver\n### Head of Tech — Smyan\n## VP Growth"))).toEqual([
      ["President", "Maya", null, 0],
      ["VP Ops", "Oliver", 0, 1],
      ["Head of Tech", "Smyan", 1, 2],
      ["VP Growth", null, 0, 1],
    ]);
  });

  it("handles Windows line endings and caps the number of positions", () => {
    expect(parseOutline("A\r\n  B\r\n").map((l) => l.parent)).toEqual([null, 0]);
    expect(parseOutline(Array.from({ length: 300 }, (_, i) => `P${i}`).join("\n"))).toHaveLength(200);
    expect(parseOutline("x".repeat(500))[0].title).toHaveLength(120);
  });
});

describe("applyOutline", () => {
  const apply = (text: string, prev: DraftPosition[] = []) => applyOutline(prev, parseOutline(text), MEMBERS);

  it("builds the draft: links @mentions with one exact member, reporting lines, ranks in order", () => {
    const draft = apply("President — @maya patel\n  VP Events — Ana Kim\n  Open: Designer\n  Advisor: Faculty — Dr. Lee");
    expect(draft.map((p) => [p.title, p.userId, p.matchState, p.personName])).toEqual([
      ["President", "maya", "CONFIRMED", "Maya Patel"],
      ["VP Events", null, "SUGGESTED", "Ana Kim"],
      ["Designer", null, "UNMATCHED", null],
      ["Faculty", null, "UNMATCHED", "Dr. Lee"],
    ]);
    expect(draft[1].suggestedUserIds[0]).toBe("ana");
    expect(draft.slice(1).every((p) => p.reportsTo === draft[0].id)).toBe(true);
    expect(draft[3].isAdvisor).toBe(true);
    const ranks = draft.map((p) => p.rank);
    expect([...ranks].sort()).toEqual(ranks);
    expect(new Set(draft.map((p) => p.id)).size).toBe(4);
  });

  it("never links an ambiguous name, even with @", () => {
    const [p] = apply("VP — @Sam Rivera");
    expect(p.userId).toBeNull();
    expect(p.matchState).toBe("SUGGESTED");
    expect(p.suggestedUserIds).toEqual(expect.arrayContaining(["sam", "sam2"]));
  });

  it("keeps ids, keys, bullets and confirmations while you type", () => {
    const first = apply("President — @Maya Patel\n  VP Events — @Ana Kim");
    const saved = first.map((p, i) => ({ ...p, id: `row${i}`, key: `key${i}`, reportsTo: p.reportsTo ? "row0" : null, responsibilities: [`r${i}`] }));
    // Rename a title, keep the person.
    const renamed = apply("President — @Maya Patel\n  VP Programs — @Ana Kim", saved);
    expect(renamed.map((p) => [p.id, p.key, p.title, p.responsibilities[0]])).toEqual([
      ["row0", "key0", "President", "r0"],
      ["row1", "key1", "VP Programs", "r1"],
    ]);
    // Swap the person, keep the title.
    const swapped = apply("President — @Maya Patel\n  VP Events — @Jay Lin", saved);
    expect(swapped[1]).toMatchObject({ id: "row1", userId: "jay", matchState: "CONFIRMED" });
    // Insert a line above: the others keep their rows.
    const inserted = apply("President — @Maya Patel\n  Treasurer\n  VP Events — @Ana Kim", saved);
    expect(inserted.map((p) => p.id)).toEqual(["row0", inserted[1].id, "row1"]);
    expect(inserted[1].id).toMatch(/^new-/);
    // Reorder: rows follow their lines.
    const moved = apply("VP Events — @Ana Kim\nPresident — @Maya Patel", saved);
    expect(moved.map((p) => [p.id, p.reportsTo])).toEqual([
      ["row1", null],
      ["row0", null],
    ]);
  });

  it("keeps a confirmed link that the text shows as a plain name", () => {
    const prev = apply("VP — @Ana Kim");
    const again = apply(serializeOutline(prev, MEMBERS), prev);
    expect(again[0]).toMatchObject({ userId: "ana", matchState: "CONFIRMED" });
    // A placeholder stays a placeholder.
    const placeholder = apply("VP — Dr. Lee");
    expect(apply("VP — Dr. Lee", placeholder)[0]).toMatchObject({ userId: null, personName: "Dr. Lee" });
  });

  it("drops the link when the person is removed or the role is opened", () => {
    const prev = apply("VP — @Ana Kim");
    expect(apply("VP", prev)[0]).toMatchObject({ userId: null, personName: null, matchState: "UNMATCHED" });
    expect(apply("Open: VP — @Ana Kim", prev)[0]).toMatchObject({ isOpen: true, userId: null, personName: null });
  });

  it("the result validates like any draft (no loops, one top)", () => {
    const draft = apply("President\n  VP\n    Lead\n  Treasurer");
    expect(validateChart(toValidationNodes(draft)).filter((i) => i.level === "error")).toEqual([]);
  });
});

describe("serializeOutline", () => {
  it("round-trips the editor's outline", () => {
    const text = ["President — @Maya Patel", "  Advisor: Faculty — Dr. Lee", "  VP Events — @Ana Kim", "    Open: Coordinator", "  Treasurer"].join("\n");
    const draft = applyOutline([], parseOutline(text), MEMBERS);
    expect(serializeOutline(draft, MEMBERS)).toBe(text.replace("Dr. Lee", "Dr. Lee"));
    // Ranks decide sibling order, whatever the array order.
    expect(serializeOutline([...draft].reverse(), MEMBERS)).toBe(text);
  });

  it("writes a suggested (unconfirmed) person without the @, and survives loops", () => {
    const draft = applyOutline([], parseOutline("VP — Ana Kim"), MEMBERS);
    expect(serializeOutline(draft, MEMBERS)).toBe("VP — Ana Kim");
    const loop = draft.concat([]).map((p) => ({ ...p, reportsTo: p.id }));
    expect(serializeOutline(loop, MEMBERS)).toBe("VP — Ana Kim");
    expect(outlineOrder([])).toEqual([]);
  });
});

describe("tray and invites", () => {
  it("lists members not on the chart and names that are not members", () => {
    const draft = applyOutline([], parseOutline("President — @Maya Patel\n  VP — Pat Doe\n  Open: Designer"), MEMBERS);
    expect(membersOffChart(draft, MEMBERS).map((m) => m.id)).toEqual(["ana", "jay", "sam", "sam2", "ivy"]);
    expect(unknownPeople(draft).map((p) => p.personName)).toEqual(["Pat Doe"]);
  });
});

describe("draftFromMembers", () => {
  it("drafts a chart from members' titles", () => {
    const text = draftFromMembers([
      { id: "j", name: "Jackson", title: "President", role: "OWNER" },
      { id: "m", name: "Mehr", title: "Founder & Advisor" },
      { id: "o", name: "Oliver", title: "VP Ops & Programs" },
      { id: "a", name: "Alex", title: "Head of Programs" },
      { id: "l", name: "Lucas", title: "VP Growth" },
      { id: "k", name: "Kristine", title: "Social media" },
      { id: "x", name: "Xavier", title: "Member" },
      { id: "y", name: "Yara", title: null },
    ]);
    expect(text.split("\n")).toEqual([
      "President — @Jackson",
      "  Advisor: Founder & Advisor — @Mehr",
      "  Head of Programs — @Alex",
      "  VP Growth — @Lucas",
      "  VP Ops & Programs — @Oliver",
      "  Social media — @Kristine",
    ]);
  });

  it("nests a member under the lead whose title shares a word", () => {
    const text = draftFromMembers([
      { id: "p", name: "P", title: "President" },
      { id: "v", name: "V", title: "VP Events" },
      { id: "c", name: "C", title: "Events coordinator" },
    ]);
    expect(text).toBe("President — @P\n  VP Events — @V\n    Events coordinator — @C");
    expect(draftFromMembers([])).toBe("");
    expect(draftFromMembers([{ id: "v", name: "V", title: "VP Events" }])).toBe("VP Events — @V");
  });
});
