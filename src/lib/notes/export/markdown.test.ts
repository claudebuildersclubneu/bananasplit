// @vitest-environment node
import { describe, expect, it } from "vitest";

import { diffStats, diffText } from "../text-diff";
import { noteToMarkdown } from "./markdown";

const p = (...content: object[]) => ({ type: "paragraph", content });
const t = (text: string, marks?: string[]) => ({
  type: "text",
  text,
  ...(marks ? { marks: marks.map((type) => ({ type })) } : {}),
});

describe("noteToMarkdown", () => {
  it("writes the title, headings, marks and lists", () => {
    const md = noteToMarkdown("Run of show", {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [t("Timeline")] },
        p(t("Doors at "), t("6:30", ["bold"]), t(" sharp", ["italic"])),
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [p(t("Badges"))] },
            { type: "listItem", content: [p(t("Lanyards"))] },
          ],
        },
        {
          type: "orderedList",
          attrs: { start: 3 },
          content: [{ type: "listItem", content: [p(t("Third"))] }],
        },
        {
          type: "taskList",
          content: [{ type: "taskItem", attrs: { checked: true }, content: [p(t("Done"))] }],
        },
      ],
    });
    expect(md).toBe(
      [
        "# Run of show",
        "## Timeline",
        "Doors at **6:30** *sharp*",
        "- Badges\n- Lanyards",
        "3. Third",
        "- [x] Done",
      ].join("\n\n") + "\n",
    );
  });

  it("covers the note's own blocks and chips", () => {
    const md = noteToMarkdown(
      "Plan",
      {
        type: "doc",
        content: [
          { type: "callout", attrs: { emoji: "💡" }, content: [p(t("Bring your badge"))] },
          p(
            { type: "mention", attrs: { id: "u1", label: "Maya Patel" } },
            t(" on "),
            { type: "dateChip", attrs: { date: "2026-10-21" } },
            t(", see "),
            { type: "noteLink", attrs: { noteId: "n2", title: "Volunteers" } },
          ),
          { type: "taskChip", attrs: { taskId: "t1", title: "Book a photographer" } },
          {
            type: "details",
            content: [
              { type: "detailsSummary", content: [t("More")] },
              { type: "detailsContent", content: [p(t("Hidden"))] },
            ],
          },
          {
            type: "linkCard",
            attrs: { kind: "database", path: "databases/budget", title: "Budget" },
          },
          { type: "image", attrs: { src: "/x", alt: "Stage", fileId: "f1" } },
          { type: "pageBreak" },
          p(t("old", ["suggestionDelete"]), t("new", ["suggestionInsert"])),
        ],
      },
      { baseUrl: "https://app.example/app/robotics", orgId: "org_1", taskDone: { t1: true } },
    );
    expect(md).toContain("> 💡 Bring your badge");
    expect(md).toContain(
      "@Maya Patel on 2026-10-21, see [Volunteers](https://app.example/app/robotics/notes/n2)",
    );
    expect(md).toContain("- [x] Book a photographer");
    expect(md).toContain("**More**\n\nHidden");
    expect(md).toContain("[Budget](https://app.example/app/robotics/databases/budget)");
    expect(md).toContain("![Stage](/api/orgs/org_1/files/f1)");
    expect(md).toContain("~~old~~new");
  });

  it("writes tables with a header row, and escapes Markdown in text", () => {
    const md = noteToMarkdown("T", {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                { type: "tableHeader", content: [p(t("Who"))] },
                { type: "tableHeader", content: [p(t("What"))] },
              ],
            },
            {
              type: "tableRow",
              content: [
                { type: "tableCell", content: [p(t("Ana"))] },
                { type: "tableCell", content: [p(t("*stars*"))] },
              ],
            },
          ],
        },
      ],
    });
    expect(md).toContain("| Who | What |\n| --- | --- |\n| Ana | \\*stars\\* |");
  });

  it("never drops unknown content", () => {
    const md = noteToMarkdown("T", {
      type: "doc",
      content: [{ type: "mystery", content: [t("kept")] }],
    });
    expect(md).toContain("kept");
  });
});

describe("diffText", () => {
  it("marks words added and removed between versions", () => {
    const parts = diffText("two rounds of six teams", "three rounds of four teams");
    expect(parts.filter((x) => x.kind !== "same").map((x) => [x.kind, x.text.trim()])).toEqual([
      ["removed", "two"],
      ["added", "three"],
      ["removed", "six"],
      ["added", "four"],
    ]);
    expect(diffStats(parts)).toEqual({ added: 2, removed: 2 });
  });

  it("has nothing to say about the same text", () => {
    expect(diffText("same", "same")).toEqual([{ kind: "same", text: "same" }]);
  });
});
